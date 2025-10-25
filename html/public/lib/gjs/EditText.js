export function EditText(config) {
  // 创建编辑器实例
  class Editor {
    constructor(type, config) {
      this.type = type;
      this.config = config;
      this.element = null;
      this.previewElement = null;
      this.editorInstance = null;
    }

    mount(elementId) {
      this.element = document.getElementById(elementId);
      if (!this.element) {
        console.error('Element not found');
        return;
      }
      if (this.type === 'markdown') {
        this.initMarkdownEditor();
      } else if (this.type === 'html') {
        this.initHTMLEditor();
      }
    }
    initMarkdownEditor() {
      // 加载 marked 库
      const script1 = document.createElement('script');
      script1.src = 'https://cdn.bootcdn.net/ajax/libs/marked/16.2.1/lib/marked.umd.js';
      document.head.appendChild(script1);
      // 创建预览区域
      this.previewElement = document.createElement('div');
      alert("bbbb")
      this.previewElement.style.marginTop = '20px';
      this.element.parentNode.insertBefore(this.previewElement, this.element.nextSibling);
      script1.onload = () => {
        this.editorInstance = this.element;
        this.element.addEventListener('input', () => {
          this.updatePreview();
        });
        this.updatePreview();
      };
    }

    updatePreview() {
      if (this.previewElement && this.element.value) { 
        try {
        const h = marked.parse(this.element.value)
        alert(h)
        this.previewElement.innerHTML = h;
        }catch(err){alert(err.stack)}
      }
    }
    initHTMLEditor() {
      // 加载 TinyMCE 库
      const script2 = document.createElement('script');
      script2.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/5/tinymce.min.js';
      document.head.appendChild(script2);
      script2.onload = () => {
        tinymce.init({
          selector: `#${this.element.id}`,
          menubar: false,
          plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table paste code help wordcount'
          ],
          toolbar:
            'undo redo | formatselect | bold italic backcolor | \
            alignleft aligncenter alignright alignjustify | \
            bullist numlist outdent indent | removeformat | help',
          content_css: '//www.tiny.cloud/css/codepen.min.css',
          setup: editor => {
            this.editorInstance = editor;
          },
          height: this.config.height,
          width: this.config.width
        });
      };
    }
  }

  return {
    markdown: () => new Editor('markdown', config),
    html: () => new Editor('html', config)
  }[config.type]();
}