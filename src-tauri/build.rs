fn main() {
  println!("cargo:rerun-if-env-changed=GITHUB_APP_CLIENT_ID");
  println!("cargo:rerun-if-env-changed=GITHUB_CLIENT_ID");
  tauri_build::build()
}
