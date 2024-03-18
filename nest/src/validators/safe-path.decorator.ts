import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsSafePathConstraint implements ValidatorConstraintInterface {
  validate(path: string, args: ValidationArguments) {
    if (typeof path !== 'string') return false;

    const isSuspicious = /[;&|`$<>]/.test(path);
    return !isSuspicious;
  }

  defaultMessage(args: ValidationArguments) {
    return `The path "${args.value}" contains invalid characters. Only safe paths are allowed.`;
  }
}

export function IsSafePath(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafePathConstraint,
    });
  };
}
