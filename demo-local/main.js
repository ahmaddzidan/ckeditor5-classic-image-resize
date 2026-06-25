import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUtils,
  Plugin,
  Command,
  ButtonView,
  InputTextView,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const ICON_LOCK =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M15.5 8H15V6a5 5 0 0 0-10 0v2h-.5A1.5 1.5 0 0 0 3 9.5v7A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 15.5 8ZM7 6a3 3 0 1 1 6 0v2H7V6Zm3 8.7a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4Z"/></svg>';
const ICON_ALIGN_LEFT =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h14v2H3V4Zm0 4h9v2H3V8Zm0 4h14v2H3v-2Zm0 4h9v2H3v-2Z"/></svg>';
const ICON_ALIGN_CENTER =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h14v2H3V4Zm3 4h8v2H6V8Zm-3 4h14v2H3v-2Zm3 4h8v2H6v-2Z"/></svg>';
const ICON_ALIGN_RIGHT =
  '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 4h14v2H3V4Zm5 4h9v2H8V8Zm-5 4h14v2H3v-2Zm5 4h9v2H8v-2Z"/></svg>';

class ImageSizeCommand extends Command {
  constructor(editor) {
    super(editor);
    this.set("isLockedAspectRatio", false);
    this.value = null;
    this._aspectRatio = null;
  }

  refresh() {
    const element = this.editor.model.document.selection.getSelectedElement();
    const imageUtils = this.editor.plugins.get("ImageUtils");
    this.isEnabled = !!element && imageUtils.isImage(element);

    const width =
      element && element.hasAttribute("width")
        ? element.getAttribute("width")
        : null;
    const height =
      element && element.hasAttribute("height")
        ? element.getAttribute("height")
        : null;
    this.value = width || height ? { width, height } : null;
    this.isLockedAspectRatio =
      element && element.hasAttribute("isLockedAspectRatio")
        ? element.getAttribute("isLockedAspectRatio")
        : false;
  }

  execute(options) {
    const model = this.editor.model;
    const imageElement = model.document.selection.getSelectedElement();
    if (!imageElement) return;

    if (options.lockAspectRatio !== undefined) {
      const wasLocked = this.isLockedAspectRatio;
      this.isLockedAspectRatio = options.lockAspectRatio;
      if (!wasLocked && this.isLockedAspectRatio) {
        const w = parseFloat(imageElement.getAttribute("width"));
        const h = parseFloat(imageElement.getAttribute("height"));
        this._aspectRatio = w && h ? h / w : null;
      }
    }

    model.change((writer) => {
      if (options.width) {
        writer.setAttribute("width", options.width, imageElement);
        if (this.isLockedAspectRatio && this._aspectRatio !== null) {
          writer.setAttribute(
            "height",
            String(Math.round(parseFloat(options.width) * this._aspectRatio)),
            imageElement,
          );
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
  }
}

class ImageAlignCommand extends Command {
  refresh() {
    const element = this.editor.model.document.selection.getSelectedElement();
    const imageUtils = this.editor.plugins.get("ImageUtils");
    this.isEnabled = !!element && imageUtils.isImage(element);
    this.value = element ? element.getAttribute("alignment") || null : null;
  }

  execute({ alignment }) {
    const model = this.editor.model;
    const imageElement = model.document.selection.getSelectedElement();
    if (!imageElement) return;

    model.change((writer) => {
      if (alignment) writer.setAttribute("alignment", alignment, imageElement);
      else writer.removeAttribute("alignment", imageElement);
    });
  }
}

class CleanImageTools extends Plugin {
  init() {
    const editor = this.editor;
    const schema = editor.model.schema;

    if (schema.isRegistered("imageBlock")) {
      schema.extend("imageBlock", {
        allowAttributes: [
          "width",
          "height",
          "isLockedAspectRatio",
          "alignment",
        ],
      });
    }

    for (const dim of ["width", "height"]) {
      const downcast = (evt, data, api) => {
        if (!api.consumable.consume(data.item, evt.name)) return;
        const writer = api.writer;
        const figure = api.mapper.toViewElement(data.item);
        const img = [...figure.getChildren()].find((el) => el.name === "img");

        if (data.attributeNewValue !== null) {
          writer.setStyle(dim, data.attributeNewValue + "px", figure);
          if (img) writer.setStyle(dim, data.attributeNewValue + "px", img);
        } else {
          writer.removeStyle(dim, figure);
          if (img) writer.removeStyle(dim, img);
        }
      };

      editor.editing.downcastDispatcher.on(
        `attribute:${dim}:imageBlock`,
        downcast,
      );
      editor.data.downcastDispatcher.on(
        `attribute:${dim}:imageBlock`,
        downcast,
      );

      editor.conversion.for("upcast").attributeToAttribute({
        view: { name: "img", styles: { [dim]: /.+/ } },
        model: {
          key: dim,
          value: (viewEl) => {
            const raw = viewEl.getStyle(dim);
            const m = raw && raw.match(/\d+/);
            return m ? m[0] : null;
          },
        },
        converterPriority: "low",
      });
    }

    const alignDowncast = (evt, data, api) => {
      if (!api.consumable.consume(data.item, evt.name)) return;
      const writer = api.writer;
      const figure = api.mapper.toViewElement(data.item);

      writer.removeStyle("display", figure);
      writer.removeStyle("margin-left", figure);
      writer.removeStyle("margin-right", figure);
      writer.removeStyle("text-align", figure);

      const alignment = data.attributeNewValue;
      if (alignment === "left") {
        writer.setStyle("display", "block", figure);
        writer.setStyle("margin-left", "0", figure);
        writer.setStyle("margin-right", "auto", figure);
        writer.setStyle("text-align", "left", figure);
      } else if (alignment === "right") {
        writer.setStyle("display", "block", figure);
        writer.setStyle("margin-left", "auto", figure);
        writer.setStyle("margin-right", "0", figure);
        writer.setStyle("text-align", "right", figure);
      } else if (alignment === "center") {
        writer.setStyle("display", "block", figure);
        writer.setStyle("margin-left", "auto", figure);
        writer.setStyle("margin-right", "auto", figure);
        writer.setStyle("text-align", "center", figure);
      }
    };

    editor.editing.downcastDispatcher.on(
      "attribute:alignment:imageBlock",
      alignDowncast,
    );
    editor.data.downcastDispatcher.on(
      "attribute:alignment:imageBlock",
      alignDowncast,
    );

    editor.commands.add("imageSize", new ImageSizeCommand(editor));
    editor.commands.add("imageAlign", new ImageAlignCommand(editor));

    this._createInput("width");
    this._createInput("height");
    this._createLockButton();
    this._createAlignButton("left", "Align Left", ICON_ALIGN_LEFT);
    this._createAlignButton("center", "Align Center", ICON_ALIGN_CENTER);
    this._createAlignButton("right", "Align Right", ICON_ALIGN_RIGHT);
  }

  _createInput(name) {
    const editor = this.editor;
    editor.ui.componentFactory.add(`imageSize:${name}`, (locale) => {
      const command = editor.commands.get("imageSize");
      const input = new InputTextView(locale);
      input.set({ placeholder: name });
      input.extendTemplate({ attributes: { class: ["resize"] } });
      input.bind("value").to(command, (value) => (value ? value[name] : null));
      if (name === "height")
        input.bind("isReadOnly").to(command, "isLockedAspectRatio");
      input.on("input", () => {
        if (isNaN(input.element.value)) return;
        editor.execute("imageSize", { [name]: input.element.value });
      });
      return input;
    });
  }

  _createLockButton() {
    const editor = this.editor;
    editor.ui.componentFactory.add("imageSize:lockAspectRatio", (locale) => {
      const command = editor.commands.get("imageSize");
      const button = new ButtonView(locale);
      button.set({
        label: "Lock Aspect",
        icon: ICON_LOCK,
        tooltip: true,
        isToggleable: true,
      });
      button.bind("isEnabled").to(command, "isEnabled");
      button.bind("isOn").to(command, "isLockedAspectRatio");
      this.listenTo(button, "execute", () => {
        editor.execute("imageSize", { lockAspectRatio: !button.isOn });
        editor.editing.view.focus();
      });
      return button;
    });
  }

  _createAlignButton(alignment, label, icon) {
    const editor = this.editor;
    const componentName = `imageSize:align${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`;
    editor.ui.componentFactory.add(componentName, (locale) => {
      const command = editor.commands.get("imageAlign");
      const button = new ButtonView(locale);
      button.set({ label, icon, tooltip: true, isToggleable: true });
      button.bind("isEnabled").to(command, "isEnabled");
      button.bind("isOn").to(command, "value", (value) => value === alignment);
      this.listenTo(button, "execute", () => {
        editor.execute("imageAlign", {
          alignment: command.value === alignment ? null : alignment,
        });
        editor.editing.view.focus();
      });
      return button;
    });
  }
}

ClassicEditor.create(document.getElementById("editor"), {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Image,
    ImageToolbar,
    ImageCaption,
    ImageStyle,
    ImageResize,
    ImageUtils,
    CleanImageTools,
  ],
  toolbar: ["bold", "italic", "|", "insertImage"],
  image: {
    toolbar: [
      "imageSize:lockAspectRatio",
      "imageSize:width",
      "imageSize:height",
      "|",
      "imageSize:alignLeft",
      "imageSize:alignCenter",
      "imageSize:alignRight",
    ],
    resizeUnit: "px",
  },
})
  .then((editor) => {
    const status = document.getElementById("status");
    const out = document.getElementById("out");

    const render = () => {
      const selected = editor.model.document.selection.getSelectedElement();
      const sizeCmd = editor.commands.get("imageSize");
      const alignCmd = editor.commands.get("imageAlign");
      status.textContent =
        `OK | isReadOnly=${editor.isReadOnly} | selected=${selected ? selected.name : "none"} | ` +
        `sizeEnabled=${sizeCmd ? sizeCmd.isEnabled : "n/a"} | alignEnabled=${alignCmd ? alignCmd.isEnabled : "n/a"}`;
      out.textContent = editor.getData();
    };

    editor.model.document.on("change:data", render);
    editor.model.document.selection.on("change:range", render);
    render();
  })
  .catch((err) => {
    const status = document.getElementById("status");
    const out = document.getElementById("out");
    status.textContent = `Init error: ${err.message}`;
    out.textContent = err.stack || String(err);
  });
