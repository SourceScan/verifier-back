import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string, args: ValidationArguments) {
    if (typeof url !== 'string') return false;

    // Define the pattern for a safe URL here. This is a simplistic approach;
    // consider using more sophisticated validation depending on your requirements.
    const unsafePatterns = /(;|&|\||`|\$)/;

    // URL is considered safe if it doesn't match unsafe patterns
    return !unsafePatterns.test(url);
  }

  defaultMessage(args: ValidationArguments) {
    return 'The URL contains unsafe characters that could lead to command line injection.';
  }
}

export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isSafeUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}
