'use client';

import { useEffect, useMemo, useState } from 'react';
import { env } from 'next-runtime-env';

import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { getWorkflowName } from '@/utils/app/helper';
import { loadContentFile } from '@/utils/app/content';

import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';
import { getReactMarkDownCustomComponents } from '@/components/Markdown/CustomComponents';

export const WelcomeMessage = () => {
  const [welcomeContent, setWelcomeContent] = useState<string>('');
  const workflow = getWorkflowName();

  const markdownComponents = useMemo(() => {
    return getReactMarkDownCustomComponents();
  }, []);

  useEffect(() => {
    const welcomeEnabled =
      env('NEXT_PUBLIC_NAT_WELCOME_MESSAGE_ON') === 'true' ||
      process?.env?.NEXT_PUBLIC_NAT_WELCOME_MESSAGE_ON === 'true';

    if (!welcomeEnabled) return;

    (async () => {
      try {
        const welcomeMarkdown = await loadContentFile('welcome.md');
        if (welcomeMarkdown) {
          setWelcomeContent(welcomeMarkdown);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    })();
  }, []);

  return (
    <div className="min-h-full flex flex-col justify-center items-center pt-5 pb-[160px]">
      <div className="w-full sm:max-w-[600px] px-8 md:px-0 flex flex-col space-y-4 text-center">
        <div className="text-3xl font-semibold text-gray-800 dark:text-white">
          {env('NEXT_PUBLIC_NAT_GREETING_TITLE') ||
            process?.env?.NEXT_PUBLIC_NAT_GREETING_TITLE ||
            `Hi, I'm ${workflow}`}
        </div>
        <div className="text-lg text-gray-600 dark:text-gray-400">
          {env('NEXT_PUBLIC_NAT_GREETING_SUBTITLE') ||
            process?.env?.NEXT_PUBLIC_NAT_GREETING_SUBTITLE ||
            'How can I assist you today?'}
        </div>
        {welcomeContent && (
          <div className="text-sm text-left text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none bg-gray-100 dark:bg-gray-800 rounded-lg p-5 [&>div>*:first-child]:mt-0 [&>div>*:last-child]:mb-0">
            <MemoizedReactMarkdown
              className="w-full break-words"
              rehypePlugins={[rehypeRaw] as any}
              remarkPlugins={[
                remarkGfm,
                [
                  remarkMath,
                  {
                    singleDollarTextMath: false,
                  },
                ],
              ]}
              components={markdownComponents}
            >
              {welcomeContent}
            </MemoizedReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
