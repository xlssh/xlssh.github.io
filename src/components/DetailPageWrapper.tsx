import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { RelatedTools } from './RelatedTools';
import { JsonViewer } from './JsonViewer';

interface RelatedLink {
  label: string;
  to: string;
  icon?: React.FC<{ size?: number; className?: string }>;
  description?: string;
}

interface DetailPageWrapperProps {
  backTo: string;
  backLabel: string;
  children: React.ReactNode;
  relatedLinks?: RelatedLink[];
  relatedTitle?: string;
  rawData?: any;
  rawTitle?: string;
}

export const DetailPageWrapper: React.FC<DetailPageWrapperProps> = ({
  backTo,
  backLabel,
  children,
  relatedLinks,
  relatedTitle = "Related Tools & Pages",
  rawData,
  rawTitle,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link
          to={backTo}
          className="flex items-center gap-1 text-sm font-semibold text-muted hover:text-text dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </Link>
      </div>

      {children}

      {relatedLinks && relatedLinks.length > 0 && (
        <RelatedTools title={relatedTitle} links={relatedLinks} />
      )}

      {rawData && (
        <JsonViewer data={rawData} title={rawTitle || "Raw JSON Database Entry"} />
      )}
    </div>
  );
};
