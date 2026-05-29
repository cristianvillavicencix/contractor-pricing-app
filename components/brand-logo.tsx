type BrandLogoProps = {
  className?: string;
  variant?: "light" | "dark";
};

const logoSrc = {
  light: "/branding/bidwise-logo-light.png",
  dark: "/branding/bidwise-logo-dark.png",
};

export function BrandLogo({ className, variant = "light" }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc[variant]}
      alt="Bidwise"
      className={className}
    />
  );
}
