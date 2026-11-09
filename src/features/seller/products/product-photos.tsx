"use client";
import type { ReactNode } from "react";
import type { useProductEditor } from "./use-product-editor";
import { PhotoPicker } from "../../../components/photo-picker";
import { Button, Card, Check, Notice } from "../../../components/ui";

function Gallery({
  title,
  images,
  remove,
  picker,
  disabled,
}: {
  title: string;
  images: string[];
  remove: (index: number) => void;
  picker: ReactNode;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image, index) => (
          <div key={`${image.slice(-30)}:${index}`}>
            <img
              src={image}
              alt={`${title} ${index + 1}`}
              className="aspect-square w-full rounded-xl object-cover"
            />
            <Button
              variant="secondary"
              className="mt-2 w-full"
              disabled={disabled}
              onClick={() => remove(index)}
            >
              Remove photo {index + 1}
            </Button>
          </div>
        ))}
      </div>
      {picker}
    </div>
  );
}
export function ProductPhotos({
  state,
}: {
  state: ReturnType<typeof useProductEditor>;
}) {
  return (
    <>
      <Card>
        <h2 className="mb-5 text-lg font-bold">
          Product photos · {state.photoCount} / 12
        </h2>
        {state.progress && <Notice>{state.progress}</Notice>}
        <Gallery
          title="General product photos"
          images={state.images}
          disabled={state.busy}
          remove={(index) =>
            state.setImages((previous) =>
              previous.filter((_, position) => position !== index),
            )
          }
          picker={
            state.images.length < 5 &&
            state.photoCount < 12 && (
              <PhotoPicker
                label="Add general photos"
                multiple
                disabled={state.busy}
                onFiles={(files, session) => state.photos(files, session)}
              />
            )
          }
        />
        <p className="my-4 text-sm text-slate-500">
          The first general photo is the cover. Otherwise the first color photo
          is used.
        </p>
        {state.colors.map((color, index) => (
          <div key={index} className="mt-6">
            <Gallery
              title={`${color.name.trim() || `Color ${index + 1}`} photos`}
              images={color.images}
              disabled={state.busy}
              remove={(imageIndex) =>
                state.setColors((previous) =>
                  previous.map((entry, position) =>
                    position === index
                      ? {
                          ...entry,
                          images: entry.images.filter(
                            (_, photoIndex) => photoIndex !== imageIndex,
                          ),
                        }
                      : entry,
                  ),
                )
              }
              picker={
                color.images.length < 4 &&
                state.photoCount < 12 && (
                  <PhotoPicker
                    label={`Add ${color.name || `color ${index + 1}`} photos`}
                    multiple
                    disabled={state.busy}
                    onFiles={(files, session) =>
                      state.photos(files, session, index)
                    }
                  />
                )
              }
            />
          </div>
        ))}
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Listing status</h2>
        <Check
          label="Active listing (visible after approval)"
          checked={state.active}
          onChange={state.setActive}
          disabled={state.busy}
        />
      </Card>
    </>
  );
}
