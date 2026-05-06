const vscode = require("vscode");

function activate(context) {
    let timer = undefined;
    let needsWorkspaceReload = false;

    const ignored = (uri) => {
        const path = uri.fsPath.replace(/\\/g, "/");

        return (
            path.includes("/target/") ||
            path.includes("/.git/") ||
            path.includes("/node_modules/")
        );
    };

    const isWorkspaceStructureFile = (uri) => {
        const path = uri.fsPath.replace(/\\/g, "/");

        return (
            path.endsWith("/Cargo.toml") ||
            path.endsWith("/Cargo.lock") ||
            path.endsWith("/.cargo/config") ||
            path.endsWith("/.cargo/config.toml") ||
            path.endsWith("/rust-toolchain") ||
            path.endsWith("/rust-toolchain.toml")
        );
    };

    const trigger = (uri) => {
        if (ignored(uri)) return;

        if (isWorkspaceStructureFile(uri)) {
            needsWorkspaceReload = true;
        }

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(async () => {
            try {
                if (needsWorkspaceReload) {
                    needsWorkspaceReload = false;

                    try {
                        await vscode.commands.executeCommand(
                            "rust-analyzer.reloadWorkspace",
                        );
                    } catch (err) {
                        console.warn(
                            "rust-analyzer.reloadWorkspace failed:",
                            err,
                        );
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                await vscode.commands.executeCommand(
                    "rust-analyzer.runFlycheck",
                );
            } catch (err) {
                console.error("Failed to run rust-analyzer.runFlycheck:", err);
            }
        }, 1000);
    };

    const patterns = [
        "**/*.rs",
        "**/Cargo.toml",
        "**/Cargo.lock",
        "**/build.rs",
        "**/.cargo/config",
        "**/.cargo/config.toml",
        "**/rust-toolchain",
        "**/rust-toolchain.toml",
    ];

    for (const pattern of patterns) {
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);

        watcher.onDidChange(trigger);
        watcher.onDidCreate(trigger);
        watcher.onDidDelete(trigger);

        context.subscriptions.push(watcher);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
