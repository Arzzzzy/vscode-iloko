import * as vscode from 'vscode';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// 1. Define the valid keywords for the Error Checker
const KEYWORDS = [
    "IPAKITA",    // PRINT
    "IKABIL",     // LET
    "NO",         // IF
    "NO KET DI",  // ELSE IF
    "NO KUMA",    // ELSE
    "BAYAT",      // WHILE
    "NALPAS"      // END
];

// 2. Define the collection that will hold the red errors
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('Iloko extension activated.');

    // ============================================================
    // PART A: File Icon Decoration (Your existing code)
    // ============================================================
    const iconPath = vscode.Uri.file(path.join(context.extensionPath, 'ilokoicon.png'));
    const ilokoDecorator = vscode.window.registerFileDecorationProvider({
        provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
            if (uri.fsPath.endsWith('.iloko')) {
                return {
                    tooltip: 'Iloko source file',
                    propagate: false,
                    badge: undefined,
                    color: undefined,
                    iconPath: iconPath
                } as vscode.FileDecoration;
            }
            return undefined;
        }
    });
    context.subscriptions.push(ilokoDecorator);

    // ============================================================
    // PART B: Error Checking / Diagnostics (NEW CODE)
    // ============================================================
    diagnosticCollection = vscode.languages.createDiagnosticCollection('iloko');
    context.subscriptions.push(diagnosticCollection);

    // Check for errors whenever the user types
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'iloko') {
                refreshDiagnostics(event.document, diagnosticCollection);
            }
        })
    );

    // Check for errors immediately when a file is opened
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(doc => {
            if (doc.languageId === 'iloko') {
                refreshDiagnostics(doc, diagnosticCollection);
            }
        })
    );

    // ============================================================
    // PART C: "Run Iloko File" Command (Your existing code)
    // ============================================================
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

// ============================================================
// HELPER FUNCTION: The Logic that finds errors
// ============================================================
function refreshDiagnostics(doc: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    const diagnostics: vscode.Diagnostic[] = [];

    for (let lineIndex = 0; lineIndex < doc.lineCount; lineIndex++) {
        const lineOfText = doc.lineAt(lineIndex);
        const text = lineOfText.text.trim();

        // Skip empty lines and comments
        if (text.length === 0 || text.startsWith('#')) {
            continue;
        }

        // Check spelling: Does the line start with a valid keyword?
        let isValid = false;
        
        const firstWord = text.split(' ')[0];
        
        // Check specific multi-word keywords
        if (text.startsWith("NO KET DI") || text.startsWith("NO KUMA")) {
            isValid = true;
        } 
        // Check single word keywords
        else if (KEYWORDS.includes(firstWord)) {
            isValid = true;
        }

        // 1. KEYWORD ERROR: If word is unknown, mark it RED
        if (!isValid) {
            const startPos = lineOfText.text.indexOf(firstWord);
            const endPos = startPos + firstWord.length;
            const range = new vscode.Range(lineIndex, startPos, lineIndex, endPos);

            const diagnostic = new vscode.Diagnostic(
                range,
                `Unknown command: "${firstWord}". Did you mean one of: ${KEYWORDS.join(', ')}?`,
                vscode.DiagnosticSeverity.Error
            );
            
            diagnostics.push(diagnostic);
        }
        
        // 2. SYNTAX ERROR: Check if IKABIL has an equals sign
        if (firstWord === "IKABIL") {
            if (!text.includes("=")) {
                 const range = new vscode.Range(lineIndex, 0, lineIndex, text.length);
                 const diagnostic = new vscode.Diagnostic(
                    range,
                    `Syntax Error: 'IKABIL' (Let) statements must include an equals sign (=). Example: IKABIL x = 10`,
                    vscode.DiagnosticSeverity.Error
                );
                diagnostics.push(diagnostic);
            }
        }
    }

    // Apply errors to the editor
    collection.set(doc.uri, diagnostics);
}

export function deactivate() {}