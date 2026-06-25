import Command from "@ckeditor/ckeditor5-core/src/command";

/**
 * The image align command. Sets inline CSS on the <figure> container
 * instead of injecting alignment classes into the view.
 *
 * Supported alignment values: 'left' | 'center' | 'right' | null (clears)
 *
 * @extends module:core/command~Command
 */
export default class ClassicImageResizeAlignCommand extends Command {
  refresh() {
    const element = this.editor.model.document.selection.getSelectedElement();
    const imageUtils = this.editor.plugins.get("ImageUtils");
    this.isEnabled = !!element && imageUtils.isImage(element);
    this.value = element ? element.getAttribute("alignment") || null : null;
  }

  /**
   * @param {Object} options
   * @param {'left'|'center'|'right'|null} options.alignment
   */
  execute({ alignment }) {
    const model = this.editor.model;
    const imageElement = model.document.selection.getSelectedElement();

    if (!imageElement) {
      return;
    }

    model.change((writer) => {
      if (alignment) {
        writer.setAttribute("alignment", alignment, imageElement);
      } else {
        writer.removeAttribute("alignment", imageElement);
      }
    });

    this.refresh();
  }
}
