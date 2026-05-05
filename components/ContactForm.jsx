'use client';

import { useForm, ValidationError } from '@formspree/react';

export default function ContactForm() {
  const [state, handleSubmit] = useForm('xwvypwgq');

  if (state.succeeded) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl px-8 py-12 text-center">
        <span className="material-symbols-outlined text-primary text-5xl mb-4 block">check_circle</span>
        <h2 className="font-manrope text-xl font-semibold text-on-surface mb-2">Message sent!</h2>
        <p className="font-inter text-base text-on-surface-variant">
          Thanks for reaching out. We&rsquo;ll get back to you as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="font-inter text-sm font-medium text-on-surface">
          Name <span className="text-error">*</span>
        </label>
        <input
          id="name"
          type="text"
          name="name"
          required
          className="font-inter text-sm text-on-surface bg-surface-container border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant"
          placeholder="Your name"
        />
        <ValidationError field="name" errors={state.errors} className="font-inter text-sm text-error" />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-inter text-sm font-medium text-on-surface">
          Email <span className="text-error">*</span>
        </label>
        <input
          id="email"
          type="email"
          name="email"
          required
          className="font-inter text-sm text-on-surface bg-surface-container border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant"
          placeholder="you@example.com"
        />
        <ValidationError field="email" errors={state.errors} className="font-inter text-sm text-error" />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="font-inter text-sm font-medium text-on-surface">
          Message <span className="text-error">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="font-inter text-sm text-on-surface bg-surface-container border border-outline-variant rounded-lg px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant resize-y"
          placeholder="How can we help?"
        />
        <ValidationError field="message" errors={state.errors} className="font-inter text-sm text-error" />
      </div>

      {/* Form-level errors */}
      <ValidationError errors={state.errors} className="font-inter text-sm text-error" />

      {/* Submit */}
      <button
        type="submit"
        disabled={state.submitting}
        className="self-start bg-primary text-on-primary font-inter text-sm font-medium px-8 py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {state.submitting ? 'Sending…' : 'Send message'}
      </button>

    </form>
  );
}
