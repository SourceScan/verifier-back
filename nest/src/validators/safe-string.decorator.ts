import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSafeStringConstraint implements ValidatorConstraintInterface {
  validate(text: string) {
    if (typeof text !== 'string') return false;

    const sanitizedText = text.replace(/[^a-zA-Z0-9_.-]/g, '');
    return sanitizedText === text;
  }

  defaultMessage() {
    return 'Input contains invalid characters';
  }
}

export function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeStringConstraint,
    });
  };
}
