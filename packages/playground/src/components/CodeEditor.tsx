import CodeMirror from "@uiw/react-codemirror"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript"
import { sdkCompletionSource } from "../runner/completions.js"

export function CodeEditor({
    value,
    onChange,
}: {
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="code-editor">
            <CodeMirror
                value={value}
                onChange={onChange}
                theme="dark"
                extensions={[
                    javascript(),
                    javascriptLanguage.data.of({
                        autocomplete: sdkCompletionSource,
                    }),
                ]}
                basicSetup={{ foldGutter: false, autocompletion: true }}
            />
        </div>
    )
}
