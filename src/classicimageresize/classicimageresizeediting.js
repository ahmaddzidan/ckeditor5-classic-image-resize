import Plugin from "@ckeditor/ckeditor5-core/src/plugin";
import ClassicImageResizeCommand from "./classicimageresizecommand";
import ClassicImageResizeAlignCommand from "./classicimageresizealigncommand";

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
        allowAttributes: [
          "width",
          "height",
          "isLockedAspectRatio",
          "alignment",
        ],
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
          downcastConverter,
        );
        editor.data.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageBlock`,
          downcastConverter,
        );
      }

      if (schema.isRegistered("imageInline")) {
        editor.editing.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageInline`,
          downcastConverter,
        );
        editor.data.downcastDispatcher.on(
          `attribute:${dimensions[key]}:imageInline`,
          downcastConverter,
        );
      }

      this._viewToModelConverter(editor, dimensions[key]);
    }

    // Register alignment downcast/upcast converters for imageBlock.
    if (schema.isRegistered("imageBlock")) {
      const alignmentConverter = this._alignmentToStyleConverter();
      editor.editing.downcastDispatcher.on(
        "attribute:alignment:imageBlock",
        alignmentConverter,
      );
      editor.data.downcastDispatcher.on(
        "attribute:alignment:imageBlock",
        alignmentConverter,
      );
    }
    this._styleToAlignmentConverter(editor);

    // Register imageSize command.
    editor.commands.add("imageSize", new ClassicImageResizeCommand(editor));

    // Register imageAlign command.
    editor.commands.add(
      "imageAlign",
      new ClassicImageResizeAlignCommand(editor),
    );
  }

  _modelToViewConverter(dimension) {
    return (evt, data, conversionApi) => {
      if (!conversionApi.consumable.consume(data.item, evt.name)) {
        return;
      }

      const viewWriter = conversionApi.writer;
      const figure = conversionApi.mapper.toViewElement(data.item);

      const viewImage = [...figure.getChildren()].find(
        (element) => element.name === "img",
      );

      const resizeUnit = this.editor.config.get("image.resizeUnit") || "%";
      if (data.attributeNewValue !== null) {
        viewWriter.setStyle(
          dimension,
          data.attributeNewValue + resizeUnit,
          figure,
        );
        viewWriter.setStyle(
          dimension,
          data.attributeNewValue + resizeUnit,
          viewImage,
        );
      } else {
        viewWriter.removeStyle(dimension, figure);
        viewWriter.removeStyle(dimension, viewImage);
      }
      viewWriter.removeClass("image_resized", figure);
    };
  }

  _alignmentToStyleConverter() {
    return (evt, data, conversionApi) => {
      if (!conversionApi.consumable.consume(data.item, evt.name)) {
        return;
      }

      const viewWriter = conversionApi.writer;
      const figure = conversionApi.mapper.toViewElement(data.item);

      // Remove all previously set alignment-related inline styles.
      viewWriter.removeStyle("display", figure);
      viewWriter.removeStyle("margin-left", figure);
      viewWriter.removeStyle("margin-right", figure);
      viewWriter.removeStyle("text-align", figure);

      const alignment = data.attributeNewValue;

      if (alignment === "left") {
        viewWriter.setStyle("display", "block", figure);
        viewWriter.setStyle("margin-left", "0", figure);
        viewWriter.setStyle("margin-right", "auto", figure);
        viewWriter.setStyle("text-align", "left", figure);
      } else if (alignment === "right") {
        viewWriter.setStyle("display", "block", figure);
        viewWriter.setStyle("margin-left", "auto", figure);
        viewWriter.setStyle("margin-right", "0", figure);
        viewWriter.setStyle("text-align", "right", figure);
      } else if (alignment === "center") {
        viewWriter.setStyle("display", "block", figure);
        viewWriter.setStyle("margin-left", "auto", figure);
        viewWriter.setStyle("margin-right", "auto", figure);
        viewWriter.setStyle("text-align", "center", figure);
      }
    };
  }

  _styleToAlignmentConverter(editor) {
    editor.conversion.for("upcast").add((dispatcher) => {
      dispatcher.on(
        "element:figure",
        (evt, data, conversionApi) => {
          if (!data.modelRange) {
            return;
          }

          const figureElement = data.viewItem;
          const float = figureElement.getStyle("float");
          const textAlign = figureElement.getStyle("text-align");
          const marginLeft = figureElement.getStyle("margin-left");
          const marginRight = figureElement.getStyle("margin-right");

          let alignment = null;
          if (float === "left" || textAlign === "left" || marginLeft === "0") {
            alignment = "left";
          } else if (
            float === "right" ||
            textAlign === "right" ||
            marginRight === "0"
          ) {
            alignment = "right";
          } else if (marginLeft === "auto" && marginRight === "auto") {
            alignment = "center";
          }

          if (!alignment) {
            return;
          }

          for (const item of data.modelRange.getItems()) {
            if (item.is("element", "imageBlock")) {
              conversionApi.writer.setAttribute("alignment", alignment, item);
              break;
            }
          }
        },
        { priority: "low" },
      );
    });
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
