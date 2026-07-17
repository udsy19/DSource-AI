"use client";

import { useRef, useState } from "react";

/**
 * One field, both paths. Paste a product link or drop a photo — no mode toggle.
 *
 * A URL/Image segmented control would make the user classify their own input
 * before we've done anything for them. We can tell a URL from a file by
 * looking, so we look.
 *
 * The plate is the page's one dark well (design.md §8), with crop marks.
 */

const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

const looksLikeUrl = (text) => /^https?:\/\/\S+\.\S+/i.test(text.trim());

const InputPlate = ({ onSearch, disabled }) => {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const takeFile = (file) => {
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      setLocalError("That file type won't work — use a JPG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("That image is over 10MB. Try a smaller one.");
      return;
    }
    setLocalError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageData(e.target.result);
      setPreview(e.target.result);
      setText("");
    };
    reader.readAsDataURL(file);
  };

  const clear = () => {
    setImageData(null);
    setPreview(null);
    setLocalError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = (event) => {
    event.preventDefault();
    if (imageData) {
      onSearch({ image: imageData });
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setLocalError("Paste a product link, or add a photo.");
      return;
    }
    if (!looksLikeUrl(trimmed)) {
      setLocalError("That doesn't look like a link. Paste a full product URL.");
      return;
    }
    setLocalError(null);
    onSearch({ url: trimmed });
  };

  // A pasted image goes straight in — people screenshot products constantly.
  const handlePaste = (event) => {
    const file = [...(event.clipboardData?.items ?? [])]
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();
    if (file) {
      event.preventDefault();
      takeFile(file);
    }
  };

  const ready = Boolean(imageData || text.trim());

  return (
    <form onSubmit={submit}>
      <div className="relative">
        <span className="viz-crop viz-crop-tl" aria-hidden="true" />
        <span className="viz-crop viz-crop-tr" aria-hidden="true" />
        <span className="viz-crop viz-crop-bl" aria-hidden="true" />
        <span className="viz-crop viz-crop-br" aria-hidden="true" />

        <button
          type="button"
          onClick={() => !preview && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            takeFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex min-h-[20rem] w-full items-center justify-center rounded-2xl border border-[var(--viz-line)] bg-[var(--viz-well)] p-4 text-left sm:min-h-[26rem] ${
            preview ? "cursor-default" : "cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={VALID_TYPES.join(",")}
            onChange={(e) => takeFile(e.target.files?.[0])}
            className="hidden"
          />

          {preview
            ? <div className="relative flex w-full items-center justify-center">
                {/* biome-ignore lint/performance/noImgElement: data URLs cannot use next/image */}
                <img
                  src={preview}
                  alt="The product you're looking for"
                  draggable={false}
                  className="block max-h-[60vh] max-w-full select-none rounded-lg object-contain"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clear();
                  }}
                  aria-label="Remove this photo"
                  className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/50 text-sm text-white hover:bg-black/70"
                >
                  ×
                </button>
              </div>
            : // The masthead already carries the page's one serif promise;
              // repeating it here would spend the plate's most prominent line
              // saying nothing new. This says what to do instead.
              <span className="block w-full px-6 py-12 text-center">
                <span className="viz-serif block text-lg italic text-stone-200">
                  Drop the photo here.
                </span>
                <span className="mt-2 block text-sm text-stone-400">
                  A product shot, a screenshot, or a snap of the label —
                  whatever you have.
                </span>
                <span className="viz-mono mt-1 block text-xs text-stone-500">
                  JPG, PNG or WebP · max 10MB
                </span>
              </span>}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLocalError(null);
          }}
          onPaste={handlePaste}
          disabled={Boolean(imageData)}
          placeholder="…or paste a product link"
          aria-label="Product link"
          className="min-w-0 flex-1 rounded-md border border-[var(--viz-line)] bg-[var(--viz-paper)] px-4 py-3 text-sm disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || !ready}
          className="cursor-pointer rounded-full bg-[var(--viz-ink)] px-6 py-3 text-sm text-[var(--viz-paper)] transition-colors hover:bg-[var(--viz-well)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Find every seller
        </button>
      </div>

      {localError && <p className="mt-3 text-sm text-red-700">{localError}</p>}
    </form>
  );
};

export default InputPlate;
