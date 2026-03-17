fn main() {
    // Check for SQLCipher feature
    if std::env::var("CARGO_FEATURE_SQLCIPHER").is_ok() {
        // Set environment variables for SQLCipher compilation
        // This requires SQLCipher to be installed on the system
        println!("cargo:rustc-env=SQLCIPHER_LIB_DIR=/usr/local/lib");
        println!("cargo:rustc-env=SQLCIPHER_INCLUDE_DIR=/usr/local/include");

        // For bundled SQLCipher, we would need to configure the build here
        // This is a placeholder for full SQLCipher integration
        println!("cargo:warning=SQLCipher feature enabled but requires manual setup");
    }

    // On Windows, test binaries need a manifest that activates comctl32 v6.
    //
    // tauri_build::build() embeds the manifest only for [[bin]] targets via
    // `cargo:rustc-link-arg-bins`, deliberately skipping [[test]] targets to
    // avoid linking WebView2 resources.  However, wry/tauri pulls in comctl32
    // functions (SetWindowSubclass, DefSubclassProc, TaskDialogIndirect, …)
    // that only exist in comctl32 v6.  Without an activation-context manifest,
    // Windows loads comctl32 v5 at process start, cannot resolve those exports,
    // and the process dies immediately with STATUS_ENTRYPOINT_NOT_FOUND
    // (0xc0000139) before any Rust code executes.
    //
    // Fix: write a minimal comctl32-v6 activation manifest to OUT_DIR and
    // forward it to the linker for test targets only.
    if std::env::var("CARGO_CFG_WINDOWS").is_ok() {
        let out_dir = std::env::var("OUT_DIR").unwrap();
        let manifest_path = std::path::PathBuf::from(&out_dir).join("comctl32v6-test.manifest");
        std::fs::write(
            &manifest_path,
            r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*" />
    </dependentAssembly>
  </dependency>
</assembly>
"#,
        )
        .expect("failed to write comctl32 v6 activation manifest for tests");

        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}",
            manifest_path.display()
        );
    }

    tauri_build::build()
}
