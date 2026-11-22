"use client";
import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";

export function PasswordInput(props: InputProps) {
  const [show, setShow] = React.useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} className="grid size-7 place-items-center rounded-md text-fg-subtle transition hover:bg-surface-sunken hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
