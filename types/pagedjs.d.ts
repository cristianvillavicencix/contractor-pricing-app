declare module "pagedjs" {
  export class Previewer {
    preview(
      content: HTMLElement,
      stylesheets: string[],
      renderTo: HTMLElement
    ): Promise<{ total?: number }>;
  }
}

declare module "pagedjs/dist/paged.esm.js" {
  export class Previewer {
    preview(
      content: HTMLElement,
      stylesheets: string[],
      renderTo: HTMLElement
    ): Promise<{ total?: number }>;
  }
}
