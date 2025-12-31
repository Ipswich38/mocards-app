#!/bin/bash
# Remove old generator code (lines 1023-1148) and clean up

cp /Users/zer0fx28/WebstormProjects/mocards-app/src/components/views/AdminPortalView.tsx /Users/zer0fx28/WebstormProjects/mocards-app/src/components/views/AdminPortalView.tsx.backup

# Remove lines 1023 to 1148 (old generator code)
sed -i '' '1023,1148d' /Users/zer0fx28/WebstormProjects/mocards-app/src/components/views/AdminPortalView.tsx

echo "✅ Old generator code removed"