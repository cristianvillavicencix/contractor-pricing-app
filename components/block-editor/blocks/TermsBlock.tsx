"use client";

import { RichTextBlock } from "./RichTextBlock";
import type { TermsBlockData } from "@/types/proposal-blocks";

interface Props {
  data: TermsBlockData & { type: "terms" };
  onChange: (data: TermsBlockData & { type: "terms" }) => void;
}

export function TermsBlock({ data, onChange }: Props) {
  return (
    <RichTextBlock
      data={data}
      onChange={(html) => onChange({ ...data, html })}
    />
  );
}
