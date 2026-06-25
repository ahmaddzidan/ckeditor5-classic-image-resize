import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import InputTextView from "@ckeditor/ckeditor5-ui/src/inputtext/inputtextview";
import ButtonView from "@ckeditor/ckeditor5-ui/src/button/buttonview";
import aspectRatioLockIcon from "../../theme/icons/aspect-ratio-lock.svg";
import alignLeftIcon from "../../theme/icons/align-left.svg";
import alignCenterIcon from "../../theme/icons/align-center.svg";
import alignRightIcon from "../../theme/icons/align-right.svg";

import "../../theme/classic-image-resize.css";

/**
 * The image style UI plugin.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ClassicImageResizeUi extends Plugin {
  /**
   * @inheritDoc
   */
  static get pluginName() {
    return "ImageResizeUI";
  }

  /**
   * @inheritDoc
   */
  init() {
    const widthDimension = {
      name: "width",
      label: "Width",
    };
    this._createInput(widthDimension);

    const heightDimension = {
      name: "height",
      label: "Height",
    };
    this._createInput(heightDimension);

    const aspectRatio = {
      name: "lockAspectRatio",
      title: "Lock Aspect Ratio",
      icon: aspectRatioLockIcon,
    };
    this._createButton(aspectRatio);

    this._createAlignButton({
      alignment: "left",
      title: "Align Left",
      icon: alignLeftIcon,
    });
    this._createAlignButton({
      alignment: "center",
      title: "Align Center",
      icon: alignCenterIcon,
    });
    this._createAlignButton({
      alignment: "right",
      title: "Align Right",
      icon: alignRightIcon,
    });
  }

  /**
   * Creates an input for each dimension and stores it in the editor {@link module:ui/componentfactory~ComponentFactory ComponentFactory}.
   *
   * @private
   * @param {module:image/imagesize/imagesizeediting} dimension
   */
  _createInput(dimension) {
    const editor = this.editor;
    const componentName = `imageSize:${dimension.name}`;

    editor.ui.componentFactory.add(componentName, (locale) => {
      const command = editor.commands.get("imageSize");
      const input = new InputTextView(locale);

      input.set({
        placeholder: dimension.name,
      });

      input.extendTemplate({
        attributes: {
          class: ["resize"],
        },
      });

      input.bind("value").to(command, (value) => {
        return value ? value[dimension.name] : null;
      });

      if (dimension.name === "height") {
        input.bind("isReadOnly").to(command, "isLockedAspectRatio");
      }

      input.on("input", () => {
        this._validateInput(input, dimension.name);
        if (input.hasError) {
          return input;
        }

        editor.execute("imageSize", {
          [dimension.name]: input.element.value,
        });
      });

      return input;
    });
  }

  _createAlignButton({ alignment, title, icon }) {
    const editor = this.editor;
    const componentName = `imageSize:align${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`;

    editor.ui.componentFactory.add(componentName, (locale) => {
      const command = editor.commands.get("imageAlign");
      const view = new ButtonView(locale);

      view.set({
        label: title,
        icon,
        tooltip: true,
        isToggleable: true,
      });

      view.bind("isEnabled").to(command, "isEnabled");
      view.bind("isOn").to(command, "value", (value) => value === alignment);

      this.listenTo(view, "execute", () => {
        // Clicking an active alignment button clears it; otherwise applies it.
        const newAlignment = command.value === alignment ? null : alignment;
        editor.execute("imageAlign", { alignment: newAlignment });
        editor.editing.view.focus();
      });

      return view;
    });
  }

  _createButton(aspectRatio) {
    const editor = this.editor;

    const componentName = `imageSize:${aspectRatio.name}`;

    editor.ui.componentFactory.add(componentName, (locale) => {
      const command = editor.commands.get("imageSize");
      const view = new ButtonView(locale);

      view.set({
        label: aspectRatio.title,
        icon: aspectRatio.icon,
        tooltip: true,
        isToggleable: true,
      });

      view.bind("isEnabled").to(command, "isEnabled");
      view.bind("isOn").to(command, "isLockedAspectRatio");

      this.listenTo(view, "execute", () => {
        editor.execute("imageSize", {
          lockAspectRatio: !view.isOn,
        });
        editor.editing.view.focus();
      });

      return view;
    });
  }

  _validateInput(view, dimension) {
    view.set("errorText", null);
    view.set("hasError", false);

    if (isNaN(view.element.value)) {
      view.set("errorText", "Input must be numeric");
      view.set("hasError", true);
    }

    if (view.element.value < 10) {
      view.set(
        "errorText",
        `Minimum ${dimension.name} size must be more than 10px`,
      );
      view.set("hasError", true);
    }
    return view;
  }
}
