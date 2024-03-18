import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSafeCompilationAttributesConstraint
  implements ValidatorConstraintInterface
{
  validate(attributes: string[], args: ValidationArguments) {
    if (!Array.isArray(attributes)) return false;

    // Define unsafe patterns - adjust these based on your security requirements
    const unsafePatterns = [
      /;/g, // Semicolon can be used to chain commands
      /&/g, // Ampersand can run a command in the background
      /\|/g, // Pipe can redirect output, potentially chaining commands
      /`/g, // Backticks can be used to execute commands
      /\$/g, // Dollar sign can introduce variables or command substitution
      /\\n/g, // Newline character can be used to start a new command
    ];

    // Ensure no attribute contains unsafe patterns
    return attributes.every(
      (attribute) => !unsafePatterns.some((pattern) => pattern.test(attribute)),
    );
  }

  defaultMessage(args: ValidationArguments) {
    return 'Compilation attributes contain unsafe characters that could lead to injection.';
  }
}

export function IsSafeCompilationAttributes(
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isSafeCompilationAttributes',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeCompilationAttributesConstraint,
    });
  };
}
