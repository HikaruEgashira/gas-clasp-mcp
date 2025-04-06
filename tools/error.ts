/**
 * GAS Clasp MCP のエラークラス定義
 */

export class ClaspError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ClaspError";
    }
}

export class ClaspInstallationError extends ClaspError {
    constructor(message: string) {
        super(`Clasp installation failed: ${message}`);
        this.name = "ClaspInstallationError";
    }
}

export class ClaspAuthenticationError extends ClaspError {
    constructor(message: string) {
        super(`Authentication failed: ${message}`);
        this.name = "ClaspAuthenticationError";
    }
}

export class CommandExecutionError extends ClaspError {
    code: number;
    stderr: string;
    stdout: string;

    constructor(
        code: number,
        stderr: string,
        stdout: string,
        command?: string,
    ) {
        const cmdInfo = command ? ` (${command})` : "";
        super(
            `Command failed with code ${code}${cmdInfo}: ${stderr || stdout}`,
        );
        this.name = "CommandExecutionError";
        this.code = code;
        this.stderr = stderr;
        this.stdout = stdout;
    }
}

export class PathValidationError extends ClaspError {
    path: string;

    constructor(path: string, reason: string) {
        super(`Invalid path "${path}": ${reason}`);
        this.name = "PathValidationError";
        this.path = path;
    }
}

export class DeploymentError extends ClaspError {
    constructor(message: string) {
        super(`Deployment failed: ${message}`);
        this.name = "DeploymentError";
    }
}

export class ValidationError extends ClaspError {
    constructor(message: string) {
        super(`Validation failed: ${message}`);
        this.name = "ValidationError";
    }
}

export function formatErrorMessage(error: unknown): string {
    if (error instanceof ClaspError) {
        return error.message;
    } else if (error instanceof Error) {
        return `An error occurred: ${error.message}`;
    } else {
        return `An unknown error occurred: ${String(error)}`;
    }
}
