export type PropControlType = 
  | 'text'
  | 'number' 
  | 'boolean'
  | 'select'
  | 'color'
  | 'slider'
  | 'textarea';

export interface PropControl {
  type: PropControlType;
  label: string;
  defaultValue: any;
  options?: Array<{ label: string; value: any }>;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export interface ComponentMetadata {
  name: string;
  description: string;
  category: string;
  props: Record<string, PropControl>;
  examples: ComponentExample[];
}

export interface ComponentExample {
  title: string;
  description?: string;
  props: Record<string, any>;
  code?: string;
}

// Component metadata definitions
export const COMPONENT_METADATA: Record<string, ComponentMetadata> = {
  'ChipStatus': {
    name: 'ChipStatus',
    description: 'Status indicator chip for displaying loading, success, error, and other states',
    category: 'Chips & Tags',
    props: {
      type: {
        type: 'select',
        label: 'Status Type',
        defaultValue: 'neutral',
        options: [
          { label: 'Loading', value: 'loading' },
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
          { label: 'Warning', value: 'warning' },
          { label: 'Info', value: 'info' },
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
          { label: 'Neutral', value: 'neutral' }
        ]
      },
      text: {
        type: 'text',
        label: 'Status Text',
        defaultValue: 'Status'
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'sm',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      showIcon: {
        type: 'boolean',
        label: 'Show Icon',
        defaultValue: true
      },
      animated: {
        type: 'boolean',
        label: 'Animated',
        defaultValue: false
      },
      icon: {
        type: 'text',
        label: 'Custom Icon',
        defaultValue: ''
      },
      tooltip: {
        type: 'text',
        label: 'Tooltip',
        defaultValue: ''
      }
    },
    examples: [
      { title: 'Loading State', props: { type: 'loading', text: 'Loading...', animated: true } },
      { title: 'Success State', props: { type: 'success', text: 'Complete' } },
      { title: 'Error State', props: { type: 'error', text: 'Failed' } },
      { title: 'Icon Only', props: { type: 'active', text: '', showIcon: true } }
    ]
  },
  'ChipCount': {
    name: 'ChipCount',
    description: 'Count display chip with formatting and prefix/suffix support',
    category: 'Chips & Tags',
    props: {
      count: {
        type: 'number',
        label: 'Count',
        defaultValue: 42
      },
      prefix: {
        type: 'text',
        label: 'Prefix',
        defaultValue: ''
      },
      suffix: {
        type: 'text',
        label: 'Suffix',
        defaultValue: ''
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'sm',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      variant: {
        type: 'select',
        label: 'Variant',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Success', value: 'success' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' },
          { label: 'Accent', value: 'accent' }
        ]
      },
      clickable: {
        type: 'boolean',
        label: 'Clickable',
        defaultValue: false
      },
      formatLargeNumbers: {
        type: 'boolean',
        label: 'Format Large Numbers',
        defaultValue: true
      },
      showSign: {
        type: 'boolean',
        label: 'Show Sign',
        defaultValue: false
      },
      icon: {
        type: 'text',
        label: 'Icon',
        defaultValue: ''
      },
      label: {
        type: 'text',
        label: 'Label',
        defaultValue: ''
      }
    },
    examples: [
      { title: 'Basic Count', props: { count: 42 } },
      { title: 'Points', props: { count: 1250, prefix: '+', suffix: 'pts' } },
      { title: 'Large Number', props: { count: 12500, formatLargeNumbers: true } },
      { title: 'Negative', props: { count: -50, showSign: true, variant: 'error' } }
    ]
  },
  'ChipFilter': {
    name: 'ChipFilter',
    description: 'Filter pill component for toggleable selections',
    category: 'Chips & Tags',
    props: {
      label: {
        type: 'text',
        label: 'Label',
        defaultValue: 'Filter'
      },
      active: {
        type: 'boolean',
        label: 'Active',
        defaultValue: false
      },
      count: {
        type: 'number',
        label: 'Count',
        defaultValue: 5
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      disabled: {
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false
      },
      removable: {
        type: 'boolean',
        label: 'Removable',
        defaultValue: false
      },
      formatNumbers: {
        type: 'boolean',
        label: 'Format Numbers',
        defaultValue: true
      },
      icon: {
        type: 'text',
        label: 'Icon',
        defaultValue: ''
      }
    },
    examples: [
      { title: 'Basic Filter', props: { label: 'All', count: 42 } },
      { title: 'Active Filter', props: { label: 'Popular', count: 15, active: true } },
      { title: 'Removable', props: { label: 'Recent', active: true, removable: true } },
      { title: 'Disabled', props: { label: 'Archived', count: 0, disabled: true } }
    ]
  },
  'ChipProgress': {
    name: 'ChipProgress',
    description: 'Progress indicator chip for step-by-step processes',
    category: 'Chips & Tags',
    props: {
      state: {
        type: 'select',
        label: 'State',
        defaultValue: 'pending',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'In Progress', value: 'in-progress' },
          { label: 'Completed', value: 'completed' },
          { label: 'Failed', value: 'failed' },
          { label: 'Warning', value: 'warning' }
        ]
      },
      label: {
        type: 'text',
        label: 'Label',
        defaultValue: 'Step'
      },
      value: {
        type: 'number',
        label: 'Value',
        defaultValue: null
      },
      maxValue: {
        type: 'number',
        label: 'Max Value',
        defaultValue: null
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'sm',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      showIcon: {
        type: 'boolean',
        label: 'Show Icon',
        defaultValue: true
      },
      showProgress: {
        type: 'boolean',
        label: 'Show Progress',
        defaultValue: true
      },
      showValue: {
        type: 'boolean',
        label: 'Show Value',
        defaultValue: false
      },
      isActive: {
        type: 'boolean',
        label: 'Active',
        defaultValue: false
      },
      unit: {
        type: 'text',
        label: 'Unit',
        defaultValue: ''
      }
    },
    examples: [
      { title: 'Pending', props: { state: 'pending', label: 'Upload' } },
      { title: 'In Progress', props: { state: 'in-progress', label: 'Processing', isActive: true } },
      { title: 'Completed', props: { state: 'completed', label: 'Done' } },
      { title: 'With Value', props: { state: 'in-progress', label: 'Progress', value: 75, maxValue: 100, showValue: true, unit: '%' } }
    ]
  },
  'ChipIcon': {
    name: 'ChipIcon',
    description: 'Icon chip with optional label and count',
    category: 'Chips & Tags',
    props: {
      icon: {
        type: 'text',
        label: 'Icon Name',
        defaultValue: 'star'
      },
      label: {
        type: 'text',
        label: 'Label',
        defaultValue: ''
      },
      count: {
        type: 'number',
        label: 'Count',
        defaultValue: null
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      variant: {
        type: 'select',
        label: 'Variant',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Success', value: 'success' },
          { label: 'Warning', value: 'warning' },
          { label: 'Error', value: 'error' }
        ]
      },
      clickable: {
        type: 'boolean',
        label: 'Clickable',
        defaultValue: false
      },
      filled: {
        type: 'boolean',
        label: 'Filled',
        defaultValue: false
      },
      weight: {
        type: 'select',
        label: 'Weight',
        defaultValue: 'regular',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Regular', value: 'regular' },
          { label: 'Medium', value: 'medium' },
          { label: 'Bold', value: 'bold' }
        ]
      }
    },
    examples: [
      { title: 'Icon Only', props: { icon: 'favorite' } },
      { title: 'With Label', props: { icon: 'star', label: 'Rating' } },
      { title: 'With Count', props: { icon: 'thumb_up', count: 42 } },
      { title: 'Clickable', props: { icon: 'share', label: 'Share', clickable: true, variant: 'primary' } }
    ]
  },
  'ChipBadge': {
    name: 'ChipBadge',
    description: 'Badge chip for displaying achievements and earned items',
    category: 'Chips & Tags',
    props: {
      earned: {
        type: 'boolean',
        label: 'Earned',
        defaultValue: false
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      showName: {
        type: 'boolean',
        label: 'Show Name',
        defaultValue: true
      },
      clickable: {
        type: 'boolean',
        label: 'Clickable',
        defaultValue: false
      }
    },
    examples: [
      { title: 'Unearned', props: { earned: false } },
      { title: 'Earned', props: { earned: true } },
      { title: 'Icon Only', props: { earned: true, showName: false } },
      { title: 'Clickable', props: { earned: true, clickable: true } }
    ]
  },
  'ChipUser': {
    name: 'ChipUser',
    description: 'User chip displaying avatar and name',
    category: 'Chips & Tags',
    props: {
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' }
        ]
      },
      variant: {
        type: 'select',
        label: 'Variant',
        defaultValue: 'default',
        options: [
          { label: 'Default', value: 'default' },
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' }
        ]
      },
      showName: {
        type: 'boolean',
        label: 'Show Name',
        defaultValue: true
      },
      clickable: {
        type: 'boolean',
        label: 'Clickable',
        defaultValue: false
      }
    },
    examples: [
      { title: 'Basic User', props: { showName: true } },
      { title: 'Avatar Only', props: { showName: false } },
      { title: 'Clickable', props: { clickable: true, variant: 'primary' } },
      { title: 'Small Size', props: { size: 'sm', showName: true } }
    ]
  },
  'Button': {
    name: 'Button',
    description: 'Versatile button component with multiple variants, sizes, and states',
    category: 'Core Controls',
    props: {
      text: {
        type: 'text',
        label: 'Button Text',
        defaultValue: 'Click me',
        description: 'The text displayed on the button'
      },
      variant: {
        type: 'select',
        label: 'Variant',
        defaultValue: 'primary',
        options: [
          { label: 'Primary', value: 'primary' },
          { label: 'Secondary', value: 'secondary' },
          { label: 'Danger', value: 'danger' },
          { label: 'Success', value: 'success' },
          { label: 'Warning', value: 'warning' },
          { label: 'Ghost', value: 'ghost' },
          { label: 'Link', value: 'link' }
        ],
        description: 'Visual style variant of the button'
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
          { label: 'Extra Large', value: 'xl' }
        ],
        description: 'Size of the button'
      },
      loading: {
        type: 'boolean',
        label: 'Loading State',
        defaultValue: false,
        description: 'Shows loading spinner when true'
      },
      disabled: {
        type: 'boolean',
        label: 'Disabled',
        defaultValue: false,
        description: 'Disables the button when true'
      },
      fullWidth: {
        type: 'boolean',
        label: 'Full Width',
        defaultValue: false,
        description: 'Makes button take full container width'
      },
      iconLeft: {
        type: 'text',
        label: 'Left Icon',
        defaultValue: '',
        description: 'Material icon name to show on the left'
      },
      iconRight: {
        type: 'text',
        label: 'Right Icon',
        defaultValue: '',
        description: 'Material icon name to show on the right'
      },
      loadingText: {
        type: 'text',
        label: 'Loading Text',
        defaultValue: 'Loading...',
        description: 'Text to show when loading'
      }
    },
    examples: [
      {
        title: 'Primary Button',
        description: 'Default primary button style',
        props: { text: 'Primary Button', variant: 'primary' }
      },
      {
        title: 'Loading State',
        description: 'Button with loading spinner',
        props: { text: 'Save Changes', variant: 'primary', loading: true }
      },
      {
        title: 'With Icons',
        description: 'Button with left and right icons',
        props: { text: 'Download', variant: 'secondary', iconLeft: 'download' }
      }
    ]
  },

  'Icon': {
    name: 'Icon',
    description: 'Material Symbols icon component with size and weight variants',
    category: 'Core Controls',
    props: {
      name: {
        type: 'text',
        label: 'Icon Name',
        defaultValue: 'star',
        description: 'Material Symbols icon name'
      },
      size: {
        type: 'select',
        label: 'Size',
        defaultValue: 'md',
        options: [
          { label: 'Extra Small', value: 'xs' },
          { label: 'Small', value: 'sm' },
          { label: 'Medium', value: 'md' },
          { label: 'Large', value: 'lg' },
          { label: 'Extra Large', value: 'xl' }
        ],
        description: 'Size of the icon'
      },
      filled: {
        type: 'boolean',
        label: 'Filled',
        defaultValue: false,
        description: 'Uses filled variant when true'
      },
      weight: {
        type: 'select',
        label: 'Weight',
        defaultValue: 'regular',
        options: [
          { label: 'Light', value: 'light' },
          { label: 'Regular', value: 'regular' },
          { label: 'Medium', value: 'medium' },
          { label: 'Bold', value: 'bold' }
        ],
        description: 'Font weight of the icon'
      },
      interactive: {
        type: 'boolean',
        label: 'Interactive',
        defaultValue: false,
        description: 'Adds hover effects when true'
      }
    },
    examples: [
      {
        title: 'Basic Icon',
        description: 'Standard icon with default settings',
        props: { name: 'home' }
      },
      {
        title: 'Large Filled',
        description: 'Large filled icon with medium weight',
        props: { name: 'favorite', size: 'lg', filled: true, weight: 'medium' }
      }
    ]
  },

  'LoadingState': {
    name: 'LoadingState',
    description: 'Standardized loading indicator with customizable text',
    category: 'State Components',
    props: {
      text: {
        type: 'text',
        label: 'Loading Text',
        defaultValue: 'Loading...',
        description: 'Text to display below the spinner'
      }
    },
    examples: [
      {
        title: 'Default Loading',
        props: { text: 'Loading...' }
      },
      {
        title: 'Custom Message',
        props: { text: 'Fetching your data...' }
      }
    ]
  },

  'ErrorState': {
    name: 'ErrorState',
    description: 'Error display with optional retry functionality',
    category: 'State Components',
    props: {
      message: {
        type: 'text',
        label: 'Error Message',
        defaultValue: 'Something went wrong',
        description: 'The error message to display'
      },
      showRetry: {
        type: 'boolean',
        label: 'Show Retry Button',
        defaultValue: true,
        description: 'Shows retry button when true'
      },
      retryText: {
        type: 'text',
        label: 'Retry Button Text',
        defaultValue: 'Try Again',
        description: 'Text for the retry button'
      },
      icon: {
        type: 'text',
        label: 'Error Icon',
        defaultValue: 'error',
        description: 'Material icon to show with error'
      }
    },
    examples: [
      {
        title: 'Basic Error',
        props: { message: 'Failed to load data' }
      },
      {
        title: 'Network Error',
        props: { 
          message: 'Network connection failed', 
          showRetry: true, 
          retryText: 'Retry Connection',
          icon: 'wifi_off'
        }
      }
    ]
  },

  'EmptyState': {
    name: 'EmptyState',
    description: 'Empty state display with optional action button',
    category: 'State Components',
    props: {
      title: {
        type: 'text',
        label: 'Title',
        defaultValue: 'No items found',
        description: 'Main title for the empty state'
      },
      subtitle: {
        type: 'text',
        label: 'Subtitle',
        defaultValue: '',
        description: 'Optional subtitle text'
      },
      icon: {
        type: 'text',
        label: 'Icon/Emoji',
        defaultValue: '📭',
        description: 'Icon or emoji to display'
      },
      showAction: {
        type: 'boolean',
        label: 'Show Action Button',
        defaultValue: false,
        description: 'Shows action button when true'
      },
      actionText: {
        type: 'text',
        label: 'Action Button Text',
        defaultValue: 'Take Action',
        description: 'Text for the action button'
      }
    },
    examples: [
      {
        title: 'Basic Empty State',
        props: { title: 'No messages', icon: '💬' }
      },
      {
        title: 'With Action',
        props: { 
          title: 'No pubs nearby', 
          subtitle: 'Try expanding your search radius',
          icon: '🏪',
          showAction: true,
          actionText: 'Expand Search'
        }
      }
    ]
  },

  'PubCardLight': {
    name: 'PubCardLight',
    description: 'Lightweight pub card component with multiple variants and status indicators',
    category: 'Data Display',
    props: {
      pubName: {
        type: 'text',
        label: 'Pub Name',
        defaultValue: 'The Crown & Anchor',
        description: 'Name of the pub'
      },
      pubAddress: {
        type: 'text',
        label: 'Address',
        defaultValue: '123 High Street, London',
        description: 'Full address of the pub'
      },
      pubCity: {
        type: 'text',
        label: 'City',
        defaultValue: 'London',
        description: 'City where the pub is located'
      },
      pubRegion: {
        type: 'text',
        label: 'Region',
        defaultValue: 'Greater London',
        description: 'Region or state'
      },
      variant: {
        type: 'select',
        label: 'Variant',
        defaultValue: 'normal',
        options: [
          { label: 'Normal', value: 'normal' },
          { label: 'Compact', value: 'compact' },
          { label: 'Overlay', value: 'overlay' }
        ],
        description: 'Visual variant of the pub card'
      },
      distance: {
        type: 'number',
        label: 'Distance (meters)',
        defaultValue: 250,
        min: 0,
        max: 10000,
        description: 'Distance to the pub in meters'
      },
      showAddress: {
        type: 'boolean',
        label: 'Show Address',
        defaultValue: true,
        description: 'Display the pub address'
      },
      showLocation: {
        type: 'boolean',
        label: 'Show Location',
        defaultValue: true,
        description: 'Display city and region'
      },
      showDistance: {
        type: 'boolean',
        label: 'Show Distance',
        defaultValue: true,
        description: 'Display distance information'
      },
      isLocalPub: {
        type: 'boolean',
        label: 'Local Pub',
        defaultValue: false,
        description: 'Mark as user\'s local pub'
      },
      hasVerifiedVisit: {
        type: 'boolean',
        label: 'Verified Visit',
        defaultValue: false,
        description: 'User has verified check-in'
      },
      hasUnverifiedVisit: {
        type: 'boolean',
        label: 'Unverified Visit',
        defaultValue: false,
        description: 'User has manual visit record'
      },
      isNearestUnvisited: {
        type: 'boolean',
        label: 'Nearest Unvisited',
        defaultValue: false,
        description: 'Target pub indicator'
      }
    },
    examples: [
      {
        title: 'Basic Pub Card',
        description: 'Standard pub card with all details',
        props: {
          pubName: 'The Red Lion',
          pubAddress: '45 Market Street',
          pubCity: 'Manchester',
          pubRegion: 'Greater Manchester',
          distance: 150
        }
      },
      {
        title: 'Compact Variant',
        description: 'Compact size for dropdowns',
        props: {
          pubName: 'The George Inn',
          pubAddress: '12 George Street',
          pubCity: 'Edinburgh',
          variant: 'compact',
          distance: 500,
          showDistance: true
        }
      },
      {
        title: 'Overlay Variant',
        description: 'For hero sections with backgrounds',
        props: {
          pubName: 'The Blacksmith\'s Arms',
          pubAddress: '78 Old Road',
          pubCity: 'York',
          variant: 'overlay',
          isLocalPub: true
        }
      },
      {
        title: 'With Visit Status',
        description: 'Showing verified visit indicator',
        props: {
          pubName: 'The Swan & Castle',
          pubAddress: '234 Castle Street',
          pubCity: 'Cardiff',
          hasVerifiedVisit: true,
          distance: 75
        }
      },
      {
        title: 'Target Pub',
        description: 'Nearest unvisited pub with target indicator',
        props: {
          pubName: 'The Kings Head',
          pubAddress: '567 Kings Road',
          pubCity: 'Brighton',
          isNearestUnvisited: true,
          distance: 320,
          showDistance: true
        }
      }
    ]
  },

  'PubCard': {
    name: 'PubCard',
    description: 'Full-featured pub card with selection mode, status badges, and detailed information',
    category: 'Data Display',
    props: {
      pubName: {
        type: 'text',
        label: 'Pub Name',
        defaultValue: 'The Crown & Anchor',
        description: 'Name of the pub'
      },
      pubAddress: {
        type: 'text',
        label: 'Address',
        defaultValue: '123 High Street, London',
        description: 'Full address of the pub'
      },
      pubCity: {
        type: 'text',
        label: 'City',
        defaultValue: 'London',
        description: 'City where the pub is located'
      },
      pubRegion: {
        type: 'text',
        label: 'Region',
        defaultValue: 'Greater London',
        description: 'Region or state'
      },
      distance: {
        type: 'number',
        label: 'Distance (meters)',
        defaultValue: 250,
        min: 0,
        max: 10000,
        description: 'Distance to the pub in meters'
      },
      selectable: {
        type: 'boolean',
        label: 'Selectable Mode',
        defaultValue: false,
        description: 'Show checkbox for selection'
      },
      isSelected: {
        type: 'boolean',
        label: 'Is Selected',
        defaultValue: false,
        description: 'Whether the pub is currently selected'
      },
      hasCheckedIn: {
        type: 'boolean',
        label: 'Has Checked In',
        defaultValue: false,
        description: 'Legacy check-in status'
      },
      checkinCount: {
        type: 'number',
        label: 'Check-in Count',
        defaultValue: 0,
        min: 0,
        max: 1000,
        description: 'Number of check-ins at this pub'
      },
      showCheckinCount: {
        type: 'boolean',
        label: 'Show Check-in Count',
        defaultValue: false,
        description: 'Display the check-in counter'
      },
      isLocalPub: {
        type: 'boolean',
        label: 'Local Pub',
        defaultValue: false,
        description: 'Mark as user\'s local pub'
      },
      hasVerifiedVisit: {
        type: 'boolean',
        label: 'Verified Visit',
        defaultValue: false,
        description: 'User has verified check-in'
      },
      hasUnverifiedVisit: {
        type: 'boolean',
        label: 'Unverified Visit',
        defaultValue: false,
        description: 'User has manual visit record'
      },
      isNearestUnvisited: {
        type: 'boolean',
        label: 'Nearest Unvisited',
        defaultValue: false,
        description: 'Target pub indicator'
      }
    },
    examples: [
      {
        title: 'Basic Pub Card',
        description: 'Standard pub card with essential information',
        props: {
          pubName: 'The Red Lion',
          pubAddress: '45 Market Street',
          pubCity: 'Manchester',
          pubRegion: 'Greater Manchester',
          distance: 150
        }
      },
      {
        title: 'Selectable Mode',
        description: 'Card with selection checkbox',
        props: {
          pubName: 'The George Inn',
          pubAddress: '12 George Street',
          pubCity: 'Edinburgh',
          distance: 500,
          selectable: true,
          isSelected: true
        }
      },
      {
        title: 'With Visit Status',
        description: 'Card showing verified visit badge',
        props: {
          pubName: 'The Swan & Castle',
          pubAddress: '234 Castle Street',
          pubCity: 'Cardiff',
          hasVerifiedVisit: true,
          distance: 75,
          checkinCount: 5,
          showCheckinCount: true
        }
      },
      {
        title: 'Target Pub',
        description: 'Nearest unvisited pub with target indicator',
        props: {
          pubName: 'The Kings Head',
          pubAddress: '567 Kings Road',
          pubCity: 'Brighton',
          isNearestUnvisited: true,
          distance: 320
        }
      },
      {
        title: 'Local Pub',
        description: 'User\'s local pub with home indicator',
        props: {
          pubName: 'The Blacksmith\'s Arms',
          pubAddress: '78 Old Road',
          pubCity: 'York',
          isLocalPub: true,
          hasCheckedIn: true,
          checkinCount: 25,
          showCheckinCount: true,
          distance: 50
        }
      },
      {
        title: 'Check-in Ready',
        description: 'Close enough to check in',
        props: {
          pubName: 'The Royal Oak',
          pubAddress: '100 Queen Street',
          pubCity: 'Bath',
          distance: 300,
          hasUnverifiedVisit: true
        }
      }
    ]
  }
};

// Helper functions
export function getComponentMetadata(componentName: string): ComponentMetadata | undefined {
  return COMPONENT_METADATA[componentName];
}

export function getAllComponentNames(): string[] {
  return Object.keys(COMPONENT_METADATA);
}

export function getComponentsByCategory(category: string): ComponentMetadata[] {
  return Object.values(COMPONENT_METADATA).filter(comp => comp.category === category);
}

export function generateDefaultProps(componentName: string): Record<string, any> {
  const metadata = getComponentMetadata(componentName);
  if (!metadata) return {};
  
  const defaultProps: Record<string, any> = {};
  Object.entries(metadata.props).forEach(([key, control]) => {
    defaultProps[key] = control.defaultValue;
  });
  
  return defaultProps;
}