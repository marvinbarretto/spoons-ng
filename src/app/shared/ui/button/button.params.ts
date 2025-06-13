export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
  GHOST: 'ghost',
  LINK: 'link',
} as const;

export const ButtonSize = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl',
} as const;

export type ButtonVariantType = typeof ButtonVariant[keyof typeof ButtonVariant];
export type ButtonSizeType = typeof ButtonSize[keyof typeof ButtonSize];
