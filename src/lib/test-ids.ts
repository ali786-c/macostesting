/**
 * Utility functions for generating consistent test IDs across the application
 * Convention: {type}-{action/field}-{context}
 * Examples:
 * - btn-submit-login
 * - input-email-signup
 * - link-home-header
 */

export const TestIds = {
  // Buttons
  buttons: {
    submit: (context: string) => `btn-submit-${context}`,
    cancel: (context: string) => `btn-cancel-${context}`,
    save: (context: string) => `btn-save-${context}`,
    delete: (context: string) => `btn-delete-${context}`,
    edit: (context: string) => `btn-edit-${context}`,
    search: (context: string) => `btn-search-${context}`,
    filter: (context: string) => `btn-filter-${context}`,
    next: (context: string) => `btn-next-${context}`,
    prev: (context: string) => `btn-prev-${context}`,
    approve: (context: string) => `btn-approve-${context}`,
    reject: (context: string) => `btn-reject-${context}`,
    publish: (context: string) => `btn-publish-${context}`,
    reset: (context: string) => `btn-reset-${context}`,
  },
  
  // Inputs
  inputs: {
    text: (field: string, context: string) => `input-${field}-${context}`,
    email: (context: string) => `input-email-${context}`,
    password: (context: string) => `input-password-${context}`,
    number: (field: string, context: string) => `input-${field}-${context}`,
    checkbox: (field: string, context: string) => `checkbox-${field}-${context}`,
    radio: (field: string, value: string, context: string) => `radio-${field}-${value}-${context}`,
    date: (field: string, context: string) => `input-date-${field}-${context}`,
    file: (field: string, context: string) => `input-file-${field}-${context}`,
  },
  
  // Links
  links: {
    to: (destination: string) => `link-${destination}`,
    external: (destination: string) => `link-external-${destination}`,
  },
  
  // Forms
  forms: {
    main: (name: string) => `form-${name}`,
  },
  
  // Sections
  sections: {
    main: (name: string) => `section-${name}`,
  },
  
  // Tabs
  tabs: {
    tab: (name: string) => `tab-${name}`,
  },
  
  // Modals
  modals: {
    modal: (name: string) => `modal-${name}`,
    close: (name: string) => `btn-close-${name}`,
  },
} as const;
