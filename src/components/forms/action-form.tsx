"use client";
import { createContext, useTransition, type FormHTMLAttributes } from "react";

export const FormPendingContext = createContext(false);

/**
 * <form> for useActionState actions that does NOT reset the fields after submission
 * (React 19 resets native `action` forms, which wipes user input when the server returns an error).
 * Native constraint validation still runs; the clicked submitter's name/value (e.g. intent) is included.
 */
export function ActionForm({ action, onSubmit, children, ...props }: Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & { action: (formData: FormData) => void }) {
  const [pending, start] = useTransition();
  return (
    <FormPendingContext.Provider value={pending}>
      <form
        {...props}
        aria-busy={pending || undefined}
        onSubmit={(e) => {
          onSubmit?.(e);
          e.preventDefault();
          if (pending) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter && submitter.getAttribute("name") ? submitter : undefined);
          start(() => action(fd));
        }}
      >
        {children}
      </form>
    </FormPendingContext.Provider>
  );
}
