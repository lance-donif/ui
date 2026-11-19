import type { ComponentProps } from "react";
import type { Piece } from "./rules";
import kite from "./assets/kite.webp";
import sail from "./assets/sail.webp";
import tulip from "./assets/tulip.webp";
import basket from "./assets/basket.webp";
import leaves from "./assets/leaves.webp";
import mobileKite from "./assets/mobile/kite.webp";
import mobileSail from "./assets/mobile/sail.webp";
import mobileTulip from "./assets/mobile/tulip.webp";
import featuredKite from "./assets/mobile/featured-kite.webp";

const desktop = { kite, sail, tulip, basket, leaves };
const mobile = { kite: mobileKite, sail: mobileSail, tulip: mobileTulip, basket, leaves };

export function fabricSource(piece: Piece, compact = false) {
  return (compact ? mobile : desktop)[piece.art];
}

export default function FabricArt({
  piece,
  featured = false,
  ...props
}: ComponentProps<"img"> & { piece: Piece; featured?: boolean }) {
  return (
    <picture>
      <source
        media="(max-width: 740px)"
        srcSet={featured && piece.id === "kite" ? featuredKite : fabricSource(piece, true)}
      />
      <img {...props} src={fabricSource(piece)} />
    </picture>
  );
}
