import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Key, ExternalLink } from 'lucide-react'

export function SetupGuide() {
  return (
    <Card className="mb-8 border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <Key className="h-5 w-5" />
          Setup Required
        </CardTitle>
        <CardDescription className="text-amber-700">
          To use this application, you need to configure your OpenAI API key
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-100">
          <AlertDescription className="text-amber-800">
            <strong>Steps to get started:</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>Get an OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">OpenAI Platform <ExternalLink className="h-3 w-3" /></a></li>
              <li>Add it as an environment variable: <code className="bg-amber-200 px-1 rounded">OPENAI_API_KEY=your_key_here</code></li>
              <li>Restart the application</li>
            </ol>
          </AlertDescription>
        </Alert>
        <div className="text-sm text-amber-700">
          <p><strong>For local development:</strong> Create a <code className="bg-amber-200 px-1 rounded">.env.local</code> file in your project root.</p>
          <p><strong>For deployment:</strong> Add the environment variable in your hosting platform's settings.</p>
        </div>
      </CardContent>
    </Card>
  )
}
