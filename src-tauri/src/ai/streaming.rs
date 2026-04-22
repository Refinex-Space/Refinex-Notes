use reqwest::Response;
use tokio::sync::watch;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SseEvent {
    pub event: Option<String>,
    pub data: String,
}

impl SseEvent {
    pub fn is_done(&self) -> bool {
        self.data.trim() == "[DONE]"
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamControl {
    Continue,
    Stop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreamOutcome {
    Completed,
    Cancelled,
}

#[derive(Debug, Default)]
pub struct SseStreamParser {
    buffer: String,
    current_event: Option<String>,
    current_data: Vec<String>,
}

impl SseStreamParser {
    pub fn push_chunk(&mut self, chunk: &[u8]) -> Result<Vec<SseEvent>, String> {
        let text = std::str::from_utf8(chunk)
            .map_err(|error| format!("SSE 响应不是有效 UTF-8: {error}"))?;
        self.buffer.push_str(text);
        self.drain_buffered_lines()
    }

    pub fn finish(&mut self) -> Result<Vec<SseEvent>, String> {
        if !self.buffer.is_empty() {
            self.buffer.push('\n');
        }
        self.drain_buffered_lines()
    }

    fn drain_buffered_lines(&mut self) -> Result<Vec<SseEvent>, String> {
        let mut events = Vec::new();

        while let Some(newline_index) = self.buffer.find('\n') {
            let mut line = self.buffer[..newline_index].to_string();
            self.buffer.drain(..=newline_index);

            if line.ends_with('\r') {
                line.pop();
            }

            self.consume_line(&line, &mut events)?;
        }

        Ok(events)
    }

    fn consume_line(&mut self, line: &str, events: &mut Vec<SseEvent>) -> Result<(), String> {
        if line.is_empty() {
            if let Some(event) = self.finish_event() {
                events.push(event);
            }
            return Ok(());
        }

        if line.starts_with(':') {
            return Ok(());
        }

        if let Some(value) = line.strip_prefix("event:") {
            self.current_event = Some(value.trim_start().to_string());
            return Ok(());
        }

        if let Some(value) = line.strip_prefix("data:") {
            self.current_data.push(value.trim_start().to_string());
            return Ok(());
        }

        if line.starts_with("id:") || line.starts_with("retry:") {
            return Ok(());
        }

        Err(format!("无法解析 SSE 行: {line}"))
    }

    fn finish_event(&mut self) -> Option<SseEvent> {
        if self.current_event.is_none() && self.current_data.is_empty() {
            return None;
        }

        Some(SseEvent {
            event: self.current_event.take(),
            data: self.current_data.drain(..).collect::<Vec<_>>().join("\n"),
        })
    }
}

pub async fn stream_sse_response<F>(
    mut response: Response,
    cancel_rx: &mut watch::Receiver<bool>,
    mut on_event: F,
) -> Result<StreamOutcome, String>
where
    F: FnMut(SseEvent) -> Result<StreamControl, String> + Send,
{
    let mut parser = SseStreamParser::default();

    loop {
        if *cancel_rx.borrow() {
            return Ok(StreamOutcome::Cancelled);
        }

        let next_chunk = tokio::select! {
            changed = cancel_rx.changed() => {
                match changed {
                    Ok(()) if *cancel_rx.borrow() => return Ok(StreamOutcome::Cancelled),
                    Ok(()) => continue,
                    Err(_) => return Ok(StreamOutcome::Cancelled),
                }
            }
            chunk = response.chunk() => chunk,
        };

        match next_chunk.map_err(|error| format!("读取 SSE 响应失败: {error}"))? {
            Some(chunk) => {
                for event in parser.push_chunk(chunk.as_ref())? {
                    if event.is_done() {
                        return Ok(StreamOutcome::Completed);
                    }
                    if matches!(on_event(event)?, StreamControl::Stop) {
                        return Ok(StreamOutcome::Completed);
                    }
                }
            }
            None => {
                for event in parser.finish()? {
                    if event.is_done() {
                        return Ok(StreamOutcome::Completed);
                    }
                    if matches!(on_event(event)?, StreamControl::Stop) {
                        return Ok(StreamOutcome::Completed);
                    }
                }
                return Ok(StreamOutcome::Completed);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{SseEvent, SseStreamParser};

    #[test]
    fn parser_collects_event_name_and_multiline_data() {
        let mut parser = SseStreamParser::default();
        let events = parser
            .push_chunk(
                b"event: content_block_delta\r\ndata: {\"delta\":{\"text\":\"Hello\"}}\r\ndata: {\"delta\":{\"text\":\" world\"}}\r\n\r\n",
            )
            .expect("events");

        assert_eq!(
            events,
            vec![SseEvent {
                event: Some("content_block_delta".to_string()),
                data: "{\"delta\":{\"text\":\"Hello\"}}\n{\"delta\":{\"text\":\" world\"}}"
                    .to_string(),
            }]
        );
    }

    #[test]
    fn parser_handles_chunk_boundaries_and_done_signal() {
        let mut parser = SseStreamParser::default();

        let first = parser.push_chunk(b"data: {\"choices\":").expect("first chunk");
        let second = parser
            .push_chunk(b"[{\"delta\":{\"content\":\"Hi\"}}]}\n\ndata: [DONE]\n\n")
            .expect("second chunk");

        assert!(first.is_empty());
        assert_eq!(second.len(), 2);
        assert_eq!(second[0].data, "{\"choices\":[{\"delta\":{\"content\":\"Hi\"}}]}");
        assert!(second[1].is_done());
    }

    #[test]
    fn parser_ignores_comments_and_rejects_unknown_fields() {
        let mut parser = SseStreamParser::default();
        let ignored = parser.push_chunk(b": keep-alive\nid: 1\nretry: 1000\n\n");
        assert!(ignored.expect("ignored lines").is_empty());

        let error = parser
            .push_chunk(b"unknown: value\n")
            .expect_err("unknown field should fail");
        assert!(error.contains("无法解析 SSE 行"));
    }
}
