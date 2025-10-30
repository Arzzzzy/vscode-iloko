import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('Iloko extension activated.');

    // 🌟 Auto-apply Iloko icon theme if not already active
    const config = vscode.workspace.getConfiguration('workbench');
    const currentIconTheme = config.get('iconTheme');

    if (currentIconTheme !== 'iloko-icons') {
        config.update('iconTheme', 'iloko-icons', vscode.ConfigurationTarget.Global)
            .then(() => {
                vscode.window.showInformationMessage('✅ Iloko Icons theme activated automatically!');
            });
    }

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

        let ilokoPath = "iloko"; // default command
        const homeDir = os.homedir();

        // 1️⃣ Check if iloko exists in PATH
        try {
            const found = execSync("which iloko").toString().trim();
            if (found) ilokoPath = found;
        } catch {
            // 2️⃣ Try venv inside home folder
            const venvPath = path.join(homeDir, "venv", "bin", "iloko");
            if (fs.existsSync(venvPath)) {
                ilokoPath = venvPath;
            } else {
                // 3️⃣ Try pipx installation path
                const pipxPath = path.join(homeDir, ".local", "bin", "iloko");
                if (fs.existsSync(pipxPath)) {
                    ilokoPath = pipxPath;
                }
            }
        }

        // 4️⃣ If still not found
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

        // ✅ Run the command in a terminal
        const terminal = vscode.window.createTerminal("Iloko Runner");
        terminal.show();
        terminal.sendText(`"${ilokoPath}" "${filePath}"`);
    });

    context.subscriptions.push(runIloko);
}

export function deactivate() {}
