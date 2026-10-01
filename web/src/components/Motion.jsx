import { useCountUp, useInView } from "../lib/motion";

export function Reveal({ as: Tag = "div", delay = 0, className = "", style, children, ...rest }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ ...style, "--delay": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CountUp({ value, decimals = 0, suffix = "", className }) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  const current = useCountUp(value, inView);
  const text = current.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the final number, not every frame of the animation. */}
      <span aria-hidden="true">
        {text}
        {suffix}
      </span>
      <span className="visually-hidden">
        {value.toLocaleString("en-US", { maximumFractionDigits: decimals })}
        {suffix}
      </span>
    </span>
  );
}
