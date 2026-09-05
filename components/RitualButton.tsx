import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cx } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "luminous" | "smoke";
  compact?: boolean;
  showArrow?: boolean;
};

export const RitualButton = forwardRef<HTMLButtonElement, Props>(function RitualButton({
    children,
    className,
    tone = "luminous",
    compact = false,
    showArrow = true,
    type = "button",
    ...props
  }, ref) {
    return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "ritual-cta group",
        tone === "smoke" && "ritual-cta-smoke",
        compact && "ritual-cta-compact",
        className,
      )}
      {...props}
    >
      <span className="ritual-cta-surface" aria-hidden="true" />
      <span className="ritual-cta-glint ritual-cta-glint-one" aria-hidden="true" />
      <span className="ritual-cta-glint ritual-cta-glint-two" aria-hidden="true" />
      <span className="ritual-cta-label">{children}</span>
      {showArrow && (
        <span className="ritual-cta-arrow" aria-hidden="true">
          <ArrowRight size={15} strokeWidth={1.25} />
        </span>
      )}
    </button>
    );
});
