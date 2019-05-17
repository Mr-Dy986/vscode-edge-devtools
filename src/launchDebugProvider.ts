// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";
import { SETTINGS_STORE_NAME } from "./utils";

type AttachCallback = (
    context: vscode.ExtensionContext,
    viaConfig: boolean,
    targetUrl?: string) => void;
type LaunchCallback = (
    context: vscode.ExtensionContext,
    launchUrl?: string,
    browserPathFromLaunchConfig?: string) => void;

export default class LaunchDebugProvider implements vscode.DebugConfigurationProvider {
    private readonly context: vscode.ExtensionContext;
    private readonly telemetryReporter: Readonly<TelemetryReporter>;
    private readonly attach: AttachCallback;
    private readonly launch: LaunchCallback;

    constructor(
        context: vscode.ExtensionContext,
        telemetryReporter: Readonly<TelemetryReporter>,
        attach: AttachCallback,
        launch: LaunchCallback) {
        this.context = context;
        this.telemetryReporter = telemetryReporter;
        this.attach = attach;
        this.launch = launch;
    }

    public provideDebugConfigurations(
        folder: vscode.WorkspaceFolder | undefined,
        token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        return Promise.resolve([{
            name: "Launch Edge and open the devtools",
            request: "launch",
            type: `${SETTINGS_STORE_NAME}.debug`,
            url: "http://localhost:8080",
        }]);
    }

    public resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration, token?: vscode.CancellationToken):
        vscode.ProviderResult<vscode.DebugConfiguration> {
        if (config && config.type === `${SETTINGS_STORE_NAME}.debug`) {
            const targetUri: string = this.getUrlFromConfig(folder, config);
            if (config.request && config.request === "attach") {
                this.telemetryReporter.sendTelemetryEvent("debug/attach");
                this.attach(this.context, true, targetUri);
            } else if (config.request && config.request === "launch") {
                this.telemetryReporter.sendTelemetryEvent("debug/launch");
                this.launch(this.context, targetUri, config.chromePath);
            }
        } else {
            this.telemetryReporter.sendTelemetryEvent("debug/error/config_not_found");
            vscode.window.showErrorMessage("No supported launch config was found.");
        }

        return undefined;
    }

    private getUrlFromConfig(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration) {
        let outUrlString = "";

        if (config.file) {
            outUrlString = config.file;
            if (folder) {
                outUrlString = outUrlString.replace("${workspaceFolder}", folder.uri.path);
            }
            outUrlString = (outUrlString.startsWith("/") ? "file://" : "file:///") + outUrlString;
        } else if (config.url) {
            outUrlString = config.url;
        }

        return outUrlString;
    }
}