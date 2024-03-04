export type TagMeta = {
  tagName?: string;
  tagUrlStub?: string;
};

// Note: New tag thumb URL only contains the tag ID. Strip out the rest in the case of old data.
export const genThumbUrl = (stub: string) => `https://orca2.furtrack.com/thumb/${stub.split('-')[0]}.jpg`;

export const fetchStub = async (name: string) => {
  const r = await fetch(`https://solar.furtrack.com/get/index/${name}`);
  const j = await r.json();
  return j.tagmeta?.tagUrlStub ?? '';
}

// vim: ts=2 sw=2 sts=2 et
