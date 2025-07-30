export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
  GHOST: 'ghost',
  LINK: 'link',
  OUTLINE: 'outline',
} as const;

export const ButtonSize = {
  EXTRA_SMALL: 'xs',
  SMALL: 'sm',
  MEDIUM: 'md',
  LARGE: 'lg',
  EXTRA_LARGE: 'xl',
} as const;

export type ButtonVariantType = (typeof ButtonVariant)[keyof typeof ButtonVariant];
export type ButtonSizeType = (typeof ButtonSize)[keyof typeof ButtonSize];
