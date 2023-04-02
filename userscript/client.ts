export type TagMeta = {
  tagName?: string;
  tagUrlStub?: string;
};

export const genThumbUrl = (stub: string) => `https://orca.furtrack.com/gallery/thumb/${stub}.jpg`;

export const fetchStub = async (name: string) => {
  const r = await fetch(`https://solar.furtrack.com/get/index/${name}`);
  const j = await r.json();
  return j.tagmeta?.tagUrlStub ?? '';
}

// vim: ts=2 sw=2 sts=2 et
