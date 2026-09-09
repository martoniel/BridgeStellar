import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/format";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("px-6 py-4 border-b border-gray-100", className)}
      {...props}
    />
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-6 py-3 border-t border-gray-100 bg-gray-50",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardBody, CardFooter };
export default Card;
