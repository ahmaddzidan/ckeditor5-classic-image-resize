import Command from "@ckeditor/ckeditor5-core/src/command";

/**
 * The image resize command. Currently, it supports both the width and the height attributes.
 *
 * @extends module:core/command~Command
 */
export default class ClassicImageResizeCommand extends Command {
  constructor(editor) {
    super(editor);

    this.set("isLockedAspectRatio", undefined);

    this.value = null;
    this.isLockedAspectRatio = false;
    this._aspectRatio = null;
  }

  init() {
    this.refresh();
  }

  /**
   * @inheritDoc
   */
  refresh() {
    const element = this.editor.model.document.selection.getSelectedElement();
    const imageUtils = this.editor.plugins.get("ImageUtils");
    this.isEnabled = !!element && imageUtils.isImage(element);

    let height = this.getHeight(element);
    let width = this.getWidth(element);

    if (width || height) {
      this.value = {
        width: width,
        height: height,
      };
    } else {
      this.value = null;
    }

    this.isLockedAspectRatio = this.getIsLockedAspectRatio(element);
  }

  getHeight(element) {
    let height = null;
    if (element && element.hasAttribute("height")) {
      height = element.getAttribute("height");
    }

    return height;
  }

  getWidth(element) {
    let width = null;
    if (element && element.hasAttribute("width")) {
      width = element.getAttribute("width");
    }

    return width;
  }

  getIsLockedAspectRatio(element) {
    let isLockedAspectRatio = null;
    if (element && element.hasAttribute("isLockedAspectRatio")) {
      isLockedAspectRatio = element.getAttribute("isLockedAspectRatio");
    }

    return isLockedAspectRatio;
  }

  /**
   * Executes the command.
   * @param {Object} options
   * @param {String|null} options.width The new width of the image.
   * @param {String|null} options.height The new height of the image.
   * @fires execute
   */
  execute(options) {
    const model = this.editor.model;
    const imageElement = model.document.selection.getSelectedElement();

    if (!imageElement) {
      return;
    }

    if (options.lockAspectRatio !== undefined) {
      const wasLocked = this.isLockedAspectRatio;
      this.isLockedAspectRatio = options.lockAspectRatio;

      // Capture the ratio at the moment the lock is turned on.
      if (!wasLocked && this.isLockedAspectRatio) {
        this._captureAspectRatio(imageElement);
      }
    }

    model.change((writer) => {
      if (options.width) {
        writer.setAttribute("width", options.width, imageElement);

        // Compute proportional height when the lock is active.
        if (this.isLockedAspectRatio && this._aspectRatio !== null) {
          const newHeight = Math.round(
            parseFloat(options.width) * this._aspectRatio,
          );
          writer.setAttribute("height", String(newHeight), imageElement);
        }
      }

      writer.setAttribute(
        "isLockedAspectRatio",
        this.isLockedAspectRatio,
        imageElement,
      );

      if (!this.isLockedAspectRatio && options.height) {
        writer.setAttribute("height", options.height, imageElement);
      }
    });

    this.refresh();
  }

  _captureAspectRatio(imageElement) {
    const width = parseFloat(this.getWidth(imageElement));
    const height = parseFloat(this.getHeight(imageElement));

    if (width && height) {
      this._aspectRatio = height / width;
      return;
    }

    // Fall back to the natural image dimensions from the DOM.
    const mapper = this.editor.editing.mapper;
    const viewElement = mapper.toViewElement(imageElement);

    if (viewElement) {
      const imgViewElement = [...viewElement.getChildren()].find(
        (el) => el.name === "img",
      );

      if (imgViewElement) {
        const domImg =
          this.editor.editing.view.domConverter.mapViewToDom(imgViewElement);

        if (domImg && domImg.naturalWidth && domImg.naturalHeight) {
          this._aspectRatio = domImg.naturalHeight / domImg.naturalWidth;
          return;
        }
      }
    }

    this._aspectRatio = null;
  }
}
