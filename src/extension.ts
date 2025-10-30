import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Iloko extension activated.');

    // 🔹 File icon decoration for .iloko files
    const iconPath = vscode.Uri.file(path.join(context.extensionPath, 'ilokoicon.png'));

    const ilokoDecorator = vscode.window.registerFileDecorationProvider({
        provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
            if (uri.fsPath.endsWith('.iloko')) {
                return {
                    tooltip: 'Iloko source file',
                    propagate: false,
                    badge: undefined,
                    color: undefined,
                    iconPath: iconPath // ✅ Correct property usage
                } as vscode.FileDecoration;
            }
            return undefined;
        }
    });

    context.subscriptions.push(ilokoDecorator);

    // 🟦 Register "Run Iloko File" command
    const runIloko = vscode.commands.registerCommand('iloko.runFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const doc = editor.document;
        if (!doc.fileName.endsWith('.iloko')) {
            vscode.window.showErrorMessage('Not an Iloko file');
            return;
        }

        await doc.save();
        const filePath = doc.fileName;

        let ilokoPath = "iloko";
        const homeDir = os.homedir();

        try {
            const found = execSync("which iloko").toString().trim();
            if (found) ilokoPath = found;
        } catch {
            const venvPath = path.join(homeDir, "venv", "bin", "iloko");
            if (fs.existsSync(venvPath)) {
                ilokoPath = venvPath;
            } else {
                const pipxPath = path.join(homeDir, ".local", "bin", "iloko");
                if (fs.existsSync(pipxPath)) {
                    ilokoPath = pipxPath;
                }
            }
        }

        if (!fs.existsSync(ilokoPath) && ilokoPath === "iloko") {
            const installOption = "Install Iloko CLI";
            const choice = await vscode.window.showErrorMessage(
                "Iloko CLI not found. Please install it first.",
                installOption
            );

            if (choice === installOption) {
                const terminal = vscode.window.createTerminal("Install Iloko CLI");
                terminal.show();
                terminal.sendText("pipx install iloko-cli");
            }
            return;
        }

        const terminal = vscode.window.createTerminal("Iloko Runner");
        terminal.show();
        terminal.sendText(`"${ilokoPath}" "${filePath}"`);
    });

    context.subscriptions.push(runIloko);
}

export function deactivate() {}
