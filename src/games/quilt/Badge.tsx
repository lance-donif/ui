import { STITCH } from "./rules";

export default function Badge() {
  return (
    <span className="qw-flower" role="img" aria-label="郁金香布标">
      {STITCH.map((v, i) => (
        <i key={i} className={v ? "sewn" : ""} />
      ))}
    </span>
  );
}
