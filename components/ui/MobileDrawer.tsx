"use client";

import * as React from "react";
import { Drawer } from "vaul";

interface MobileDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function MobileDrawer({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
}: MobileDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[85dvh] flex-col rounded-t-[20px] border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="flex flex-col p-4">
            <Drawer.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </Drawer.Title>
            {description && (
              <Drawer.Description className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </Drawer.Description>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && (
            <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
