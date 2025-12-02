import { Injectable, Logger } from '@nestjs/common';
import * as cp from 'child_process';
import { promisify } from 'util';
import { ExecException } from '../../exceptions/exec.exception';

const execAsync = promisify(cp.exec);

@Injectable()
export class ExecService {
  private readonly logger = new Logger(ExecService.name);

  async executeCommand(
    command: string,
  ): Promise<{ stdout: string[]; stderr: string[] }> {
    try {
      const { stdout, stderr } = await execAsync(command);

      const { stdout: parsedStdout, stderr: parsedStderr } = this.parseLogs(
        stdout,
        stderr,
      );

      if (parsedStderr.length > 0) {
        throw new ExecException(
          command,
          `Error executing command: ${parsedStderr}`,
          parsedStdout,
          parsedStderr,
        );
      }

      return { stdout: parsedStdout, stderr: parsedStderr };
    } catch (error: any) {
      throw new ExecException(
        command,
        error.message,
        error.stdout,
        error.stderr,
      );
    }
  }

  private parseLogs(
    stdout: string,
    stderr: string,
  ): { stdout: string[]; stderr: string[] } {
    const parsedStdout: string[] = stdout ? stdout.split('\n') : [];
    const parsedStderr: string[] = [];

    const errorIndicators = [
      'error:', // Standard error prefix in Rust and common error prefix
      'fatal:', // Fatal errors, commonly used in git operations
      'failed', // Indicative of a failure in an operation
      'cannot', // Cannot perform an operation
      "can't", // Short form of cannot
      'panic:', // Rust panic messages
      // Linux errors
      'unrecoverable error', // Indicative of an unrecoverable error
      'command failed', // Common phrase in script/command execution failures
      'no such', // Common phrase in file/directory/network related errors
      'not found', // Common phrase when something expected is not found
      'permission denied', // Access or permission-related errors
      'access denied', // Similar to permission denied
      // TypeScript errors
      'ts[0-9]+', // TypeScript error codes (e.g., TS1005)
      'syntaxerror:', // Syntax errors, typically with a colon
      'typeerror:', // Type errors, typically with a colon
      'is not assignable to type', // Specific type assignment errors
      'has no exported member', // Specific import/export errors in TypeScript
      'cannot find name', // When a variable or function is not found
      'is not a function', // Calling something that's not a function
      'is not a module', // Importing from a non-module entity
      "object is possibly 'null'", // Nullability errors in TypeScript
      "object is possibly 'undefined'", // Undefined errors in TypeScript
      'argument of type', // Specific argument type errors
      'property does not exist on type', // Property access errors on types
      'expected .*, got .*', // Expected vs. got errors, common in TypeScript type mismatches
    ];

    if (stderr) {
      const lines = stderr.split('\n');
      lines.forEach((line) => {
        // Check if the line contains any of the error indicators
        if (
          errorIndicators.some((indicator) =>
            line.toLowerCase().includes(indicator),
          )
        ) {
          parsedStderr.push(line);
        } else {
          // Handling non-error messages in stderr
          parsedStdout.push(line);
        }
      });
    }

    return { stdout: parsedStdout, stderr: parsedStderr };
  }
}
