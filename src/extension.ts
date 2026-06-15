import * as vscode from 'vscode';
import { SidebarProvider } from './sidebarProvider';
import { generatePrDescription } from './commands/prDescription';
import { generateCommitMessage } from './commands/commitMessage';
import { explainCode } from './commands/codeExplainer';
import { buildRegex } from './commands/regexBuilder';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('m365CopilotVsCodeExtension.prDescription', () => {
      generatePrDescription(sidebarProvider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('m365CopilotVsCodeExtension.commitMessage', () => {
      generateCommitMessage(sidebarProvider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('m365CopilotVsCodeExtension.explainCode', () => {
      explainCode(sidebarProvider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('m365CopilotVsCodeExtension.regexBuilder', () => {
      buildRegex(sidebarProvider);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('m365CopilotVsCodeExtension.focusSidebar', () => {
      vscode.commands.executeCommand('m365CopilotVsCodeExtension.sidebar.focus');
    })
  );
}

export function deactivate() {}
