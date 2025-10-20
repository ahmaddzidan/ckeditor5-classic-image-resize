import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import ClassicImageResizeCommand from "./classicimageresizecommand";

export default class ClassicImageResizeEditing extends Plugin {
  /**
   * @inheritDoc
   */
  static get pluginName() {
    return "ImageSizeEditing";
  }

  /**
   * @inheritDoc
   */
  init() {
    const editor = this.editor;
    const schema = editor.model.schema;
    const dimensions = ["width", "height"];

    // Extend both imageBlock and imageInline schemas
    if (schema.isRegistered("imageBlock")) {
      schema.extend("imageBlock", {
        allowAttributes: ["width", "height", "isLockedAspectRatio"],
      });
    }

    if (schema.isRegistered("imageInline")) {
      schema.extend("imageInline", {
        allowAttributes: ["width", "height", "isLockedAspectRatio"],
      });
    }

    for (let key in dimensions) {
      let downcastConverter = this._modelToViewConverter(dimensions[key]);

      // Set up converters for both image types
      if (schema.isRegistered("imageBlock")) {
        editor.editing.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageBlock`,
          downcastConverter
        );
        editor.data.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageBlock`,
          downcastConverter
        );
      }

      if (schema.isRegistered("imageInline")) {
        editor.editing.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageInline`,
          downcastConverter
        );
        editor.data.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageInline`,
          downcastConverter
        );
      }

      this._viewToModelConverter(editor, dimensions[key]);
    }

    // Register imageSize command.
    editor.commands.add("imageSize", new ClassicImageResizeCommand(editor));
  }

  _modelToViewConverter(dimension) {
    return (evt, data, conversionApi) => {
      if (!conversionApi.consumable.consume(data.item, evt.name)) {
        return;
      }

      const viewWriter = conversionApi.writer;
      const figure = conversionApi.mapper.toViewElement(data.item);

      const viewImage = [...figure.getChildren()].find(
        (element) => element.name === "img"
      );

      const resizeUnit = this.editor.config.get("image.resizeUnit") || "%";
      if (data.attributeNewValue !== null) {
        viewWriter.setStyle(
          dimension,
          data.attributeNewValue + resizeUnit,
          figure
        );
        viewWriter.setStyle(
          dimension,
          data.attributeNewValue + resizeUnit,
          viewImage
        );
      } else {
        viewWriter.removeStyle(dimension, figure);
        viewWriter.removeStyle(dimension, viewImage);
      }
      viewWriter.removeClass("image_resized", figure);
    };
  }

  _viewToModelConverter(editor, dimension) {
    editor.conversion.for("upcast").attributeToAttribute({
      view: {
        name: "img",
        styles: {
          [dimension]: /.+/,
        },
      },
      model: {
        key: dimension,
        value: (viewElement) => viewElement.getStyle(dimension).match(/\d+/g),
      },
      converterPriority: "low",
    });
  }
}
