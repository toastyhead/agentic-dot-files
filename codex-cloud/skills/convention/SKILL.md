---
name: convention
description: Apply Respan frontend TypeScript, JavaScript, React, Redux, component-library, copy, and state conventions. Use when implementing or reviewing frontend source files; do not use for backend-only work.
---

# Frontend Development Conventions

This document outlines the coding standards and best practices for the Keywords AI frontend codebase. Following these conventions ensures consistency, maintainability, and code quality across the project.

---

## Table of Contents

1. [Boolean Naming Conventions](#boolean-naming-conventions)
2. [Redux Action Naming](#redux-action-naming)
3. [API Calls and Redux Integration](#api-calls-and-redux-integration)
4. [Constants and Types (DRY Principle)](#constants-and-types-dry-principle)
5. [Component Design Patterns](#component-design-patterns)
6. [Use Existing Components Over Native HTML](#use-existing-components-over-native-html)
7. [Text Capitalization](#text-capitalization)
8. [Avoid Unnecessary State](#avoid-unnecessary-state)

---

## Boolean Naming Conventions

**Rule:** All boolean variables, state, and props MUST use "is" or "has" prefix.

### ✅ Correct

```typescript
// State variables
const [isLoading, setIsLoading] = useState(false);
const [hasError, setHasError] = useState(false);
const [isModalOpen, setIsModalOpen] = useState(false);

// Redux state
type CreditTransactionsState = {
  transactions: CreditTransaction[];
  isLoading: boolean;
  isBalanceLoading: boolean;
  isPaymentSessionLoading: boolean;
};

// Component props
interface ButtonProps {
  isDisabled?: boolean;
  isPrimary?: boolean;
  hasIcon?: boolean;
}

// Flags and conditions
const isValid = amount >= 10 && amount <= 10000;
const hasPermission = user?.role === "admin";
const isAuthenticated = !!token;
```

### ❌ Incorrect

```typescript
// NO - Missing prefix
const [loading, setLoading] = useState(false);
const [error, setError] = useState(false);
const [modalOpen, setModalOpen] = useState(false);

// NO - Wrong prefix
const [shouldLoad, setShouldLoad] = useState(false);
const [canEdit, setCanEdit] = useState(false);
const [willUpdate, setWillUpdate] = useState(false);

// NO - Using adjectives without "is"
const [disabled, setDisabled] = useState(false);
const [visible, setVisible] = useState(false);
const [active, setActive] = useState(false);
```

### When to Use "is" vs "has"

- **"is"** - For states, conditions, and statuses
  - `isLoading`, `isOpen`, `isValid`, `isActive`, `isDisabled`
- **"has"** - For possession or existence of something
  - `hasError`, `hasPermission`, `hasChildren`, `hasIcon`, `hasCloseButton`

---

## Redux Action Naming

**Rule:** Use `getXxx` naming pattern for Redux async thunks that fetch data, NOT `fetchXxx`.

### ✅ Correct

```typescript
// Redux thunks - use "get" prefix
export const getCreditTransactions = createAsyncThunk(
  "creditTransactions/getCreditTransactions",
  async (_, { rejectWithValue }) => {
    // ...
  }
);

export const getCreditBalance = createAsyncThunk(
  "creditTransactions/getCreditBalance",
  async (_, { rejectWithValue }) => {
    // ...
  }
);

export const getDatasets = createAsyncThunk(
  "datasets/getDatasets",
  async (params, { rejectWithValue }) => {
    // ...
  }
);

// Other action types
export const createCreditPurchaseSession = createAsyncThunk(...);
export const updateDataset = createAsyncThunk(...);
export const deleteCondition = createAsyncThunk(...);
```

### ❌ Incorrect

```typescript
// NO - Don't use "fetch" prefix
export const fetchCreditTransactions = createAsyncThunk(...);
export const fetchCreditBalance = createAsyncThunk(...);
export const fetchDatasets = createAsyncThunk(...);
```

### Action Naming Patterns

- **Get data:** `getXxx` (e.g., `getCreditTransactions`, `getUserProfile`)
- **Create:** `createXxx` (e.g., `createDataset`, `createPaymentSession`)
- **Update:** `updateXxx` (e.g., `updateDataset`, `updateUser`)
- **Delete:** `deleteXxx` (e.g., `deleteCondition`, `deleteApiKey`)
- **Validation:** `validateXxx` (e.g., `validateCondition`)
- **Search:** `searchXxx` (e.g., `searchLogs`)

---

## API Calls and Redux Integration

**Rule:** Avoid making API calls directly in components. If a Redux slice exists for that domain, implement API calls as Redux actions.

### ✅ Correct - API Call in Redux Slice

```typescript
// src/store/slices/creditTransactionsSlice.ts
export const getCreditBalance = createAsyncThunk(
  "creditTransactions/getCreditBalance",
  async (_, { rejectWithValue }) => {
    try {
      const response = await keywordsRequest({
        path: "api/payment/credit-transactions/summary/",
        method: "GET",
      });
      return response.current_credit_balance;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch balance"
      );
    }
  }
);

// Component usage
const CreditsPage = () => {
  const dispatch = useTypedDispatch();
  const currentBalance = useTypedSelector(
    (state) => state.creditTransactions.currentBalance
  );
  const isBalanceLoading = useTypedSelector(
    (state) => state.creditTransactions.isBalanceLoading
  );

  useEffect(() => {
    dispatch(getCreditBalance());
  }, [dispatch]);

  return <div>${currentBalance}</div>;
};
```

### ❌ Incorrect - Direct API Call in Component

```typescript
// Component - DON'T DO THIS
const CreditsPage = () => {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    keywordsRequest({
      path: "api/payment/credit-transactions/summary/",
      method: "GET",
    })
      .then((response) => {
        setBalance(response.current_credit_balance);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, []);

  return <div>${balance}</div>;
};
```

### When Direct API Calls Are Acceptable

Direct API calls in components are acceptable ONLY when:

1. **No Redux slice exists** for that domain
2. **One-time operations** that don't need global state (e.g., export actions)
3. **Component-specific data** that won't be reused elsewhere

Even in these cases, consider creating a Redux slice if:

- The data might be needed in multiple components
- The operation has loading/error states that should be managed globally
- The data should persist across navigation

### Example: One-Time Export Action (Direct API Call OK)

```typescript
// This is acceptable - one-time export doesn't need global state
const handleExport = async () => {
  setIsExporting(true);
  try {
    await keywordsRequest({
      path: "api/datasets/export/",
      method: "POST",
      data: { dataset_id: datasetId },
    });
    dispatch(
      dispatchNotification({ type: "success", title: "Export started" })
    );
  } catch (error) {
    dispatch(dispatchNotification({ type: "error", title: "Export failed" }));
  }
  setIsExporting(false);
};
```

---

## Constants and Types (DRY Principle)

**Rule:** Create proper constant files and type files. Always try to reuse existing constants and types instead of creating new ones (Don't Repeat Yourself).

### File Organization

```
src/
├── types/
│   ├── credit.ts           # Credit-related types
│   ├── dataset.ts          # Dataset-related types
│   ├── experimentV2Types.ts # Experiment types
│   └── index.ts            # Export all types
├── utilities/
│   └── constants/
│       ├── creditConstants.ts
│       ├── datasetConstants.ts
│       └── experimentV2Const.ts
```

### ✅ Correct - Reusing Types

```typescript
// src/types/credit.ts
export type CreditTransactionType =
  | "purchase"
  | "grant"
  | "adjustment"
  | "refund"
  | "bonus";

export type CreditTransaction = {
  id: string;
  amount: number;
  transaction_type: CreditTransactionType;
  created_at: string;
  description: string;
};

// Component - Reuse existing types
import { CreditTransaction, CreditTransactionType } from "src/types";

const getTransactionTypeLabel = (type: CreditTransactionType): string => {
  // Use the imported type
};

const CreditTransactionsTable: React.FC<{
  data: CreditTransaction[];
}> = ({ data }) => {
  // Use the imported type
};
```

### ❌ Incorrect - Duplicating Types

```typescript
// Component - DON'T DO THIS
type TransactionType = "purchase" | "grant" | "adjustment"; // Duplicate!

interface Transaction {
  // Duplicate!
  id: string;
  amount: number;
  type: TransactionType;
}

const CreditTransactionsTable: React.FC<{
  data: Transaction[];
}> = ({ data }) => {
  // ...
};
```

### Constants Files

```typescript
// src/utilities/constants/creditConstants.ts
export const CREDIT_TRANSACTION_TYPES = {
  PURCHASE: "purchase",
  GRANT: "grant",
  ADJUSTMENT: "adjustment",
  REFUND: "refund",
  BONUS: "bonus",
} as const;

export const CREDIT_LIMITS = {
  MIN_PURCHASE: 10,
  MAX_PURCHASE: 10000,
} as const;

export const SUGGESTED_AMOUNTS = [50, 100, 250, 500, 1000] as const;

// Usage in component
import {
  CREDIT_LIMITS,
  SUGGESTED_AMOUNTS,
} from "src/utilities/constants/creditConstants";

const handlePurchase = () => {
  if (amount < CREDIT_LIMITS.MIN_PURCHASE) {
    // Validation using constant
  }
};
```

### Before Creating New Constants/Types

**Ask yourself:**

1. ✅ Does a similar type/constant already exist?
2. ✅ Can I extend an existing type instead of creating a new one?
3. ✅ Is this constant used in multiple places? (If not, inline it)
4. ✅ Does this belong in an existing constants file?

---

## Component Design Patterns

### Avoid Thin Wrapper Components

**Rule:** Do NOT create components that are just thin wrappers around existing components without adding significant functionality.

### ❌ Bad - Thin Wrapper Component

```typescript
// DON'T CREATE THIS - It's just a thin wrapper
// src/components/Modals/AddCreditsModal.tsx
export const AddCreditsModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      variant="sm"
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      title="Add credits"
    >
      <AddCreditsForm />
    </Modal>
  );
};

// Then used as:
<AddCreditsModal isOpen={isOpen} onClose={handleClose} />;
```

### ✅ Good - Inline Modal

```typescript
// Just use the Modal component directly in the parent
export const CreditsPage = () => {
  const [isAddCreditsModalOpen, setIsAddCreditsModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("100");

  return (
    <>
      <ButtonNew
        text="Add credits"
        onClick={() => setIsAddCreditsModalOpen(true)}
      />

      <Modal
        variant="sm"
        title="Add credits"
        subtitle="Enter the amount you'd like to purchase"
        isModalOpen={isAddCreditsModalOpen}
        setIsModalOpen={setIsAddCreditsModalOpen}
        primaryButtonText="Continue to payment"
        primaryButtonOnClick={handlePurchaseCredits}
      >
        <div className="flex flex-col gap-sm w-full">
          {/* Inline form content */}
          <TextInputSmall
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};
```

### When to Create Wrapper Components

Create wrapper components ONLY when:

1. **Significant logic added** - The wrapper adds complex behavior or state management
2. **Multiple instances** - The exact same modal/dialog is used in 5+ different places
3. **Reusable patterns** - Creating a specific pattern that will be reused (e.g., `ConfirmationDialog`)

### Example: Good Wrapper Component

```typescript
// This is acceptable - adds significant functionality
export const ConfirmDeleteDialog = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
}) => {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmValid = confirmText === `delete ${itemName}`;

  return (
    <Modal
      variant="confirmation"
      title={`Delete ${itemType}`}
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      primaryButtonText="Delete"
      primaryButtonDisabled={!isConfirmValid}
      primaryButtonOnClick={onConfirm}
    >
      <div className="flex flex-col gap-sm">
        <p>Type "delete {itemName}" to confirm:</p>
        <TextInput
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
        />
      </div>
    </Modal>
  );
};
```

---

### Add Forms in Modals Inline

**Rule:** Build forms directly inside modals rather than creating separate form components. Forms are simple enough to be inline.

### ✅ Good - Inline Form in Modal

```typescript
export const CreditsPage = () => {
  const [isAddCreditsModalOpen, setIsAddCreditsModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("100");
  const suggestedAmounts = [50, 100, 250, 500, 1000];

  const handlePurchaseCredits = async () => {
    const amount = parseFloat(creditAmount);
    // Validation and purchase logic
  };

  return (
    <Modal
      variant="sm"
      title="Add credits"
      isModalOpen={isAddCreditsModalOpen}
      setIsModalOpen={setIsAddCreditsModalOpen}
      primaryButtonText="Continue to payment"
      primaryButtonOnClick={handlePurchaseCredits}
    >
      {/* Form content inline */}
      <div className="flex flex-col gap-sm w-full">
        {/* Suggested amounts */}
        <div className="flex flex-col gap-xxs">
          <span className="text-sm text-gray-4">Suggested amounts</span>
          <div className="flex flex-row gap-xxs flex-wrap">
            {suggestedAmounts.map((amount) => (
              <ButtonNew
                key={amount}
                size="sm"
                variant={
                  creditAmount === amount.toString() ? "primary" : "secondary"
                }
                text={`$${amount}`}
                onClick={() => setCreditAmount(amount.toString())}
              />
            ))}
          </div>
        </div>

        {/* Custom amount input */}
        <div className="flex flex-col gap-xxs">
          <span className="text-sm text-gray-4">
            Or enter custom amount ($10 - $10,000)
          </span>
          <TextInputSmall
            type="number"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            placeholder="Enter amount"
            step="0.01"
          />
        </div>

        {/* Info text */}
        <div className="flex flex-col gap-xxxs p-xs bg-gray-2 rounded">
          <span className="text-xs text-gray-4">
            • Minimum purchase: $10.00
          </span>
          <span className="text-xs text-gray-4">
            • Maximum purchase: $10,000.00
          </span>
          <span className="text-xs text-gray-4">
            • Credits are added immediately
          </span>
        </div>
      </div>
    </Modal>
  );
};
```

### ❌ Bad - Separate Form Component

```typescript
// DON'T DO THIS - Unnecessary abstraction
// src/components/Forms/AddCreditsForm.tsx
export const AddCreditsForm = ({ onSubmit }) => {
  const [creditAmount, setCreditAmount] = useState("100");
  const suggestedAmounts = [50, 100, 250, 500, 1000];

  return (
    <div className="flex flex-col gap-sm w-full">
      {/* Same form content as above */}
    </div>
  );
};

// Then used as:
<Modal variant="sm" title="Add credits">
  <AddCreditsForm onSubmit={handleSubmit} />
</Modal>;
```

### When to Create Separate Form Components

Create separate form components ONLY when:

1. **Complex validation** - Using `react-hook-form` with 10+ fields
2. **Multiple steps** - Multi-step forms with wizard navigation
3. **Heavy reuse** - The exact same form is used in 3+ different contexts
4. **Complex field dependencies** - Fields that conditionally show/hide based on complex logic

### Example: Acceptable Separate Form Component

```typescript
// This is acceptable - complex multi-step form with validation
export const CreateExperimentForm = ({ onSubmit }) => {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [currentStep, setCurrentStep] = useState(1);
  const experimentType = watch("type");

  // 50+ lines of complex form logic, field dependencies, etc.

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Multiple steps with complex validation */}
    </form>
  );
};
```

---

## Use Existing Components Over Native HTML

**Rule:** Always use existing components from `src/components/` instead of native HTML elements. Check the component library before using native HTML tags.

### Why This Matters

- **Consistency:** Ensures uniform styling and behavior across the application
- **Theming:** Custom components follow the design system automatically
- **Accessibility:** Custom components have built-in accessibility features
- **Maintainability:** Changes to design propagate through all usages

### Common Component Replacements

#### Buttons

### ✅ Correct - Use ButtonNew Component

```typescript
import { ButtonNew } from "src/components";

// Primary button
<ButtonNew
  text="Add credits"
  variant="primary"
  onClick={handleClick}
/>

// Secondary button
<ButtonNew
  text="Cancel"
  variant="secondary"
  onClick={handleCancel}
/>

// Different sizes
<ButtonNew text="Small button" size="sm" />
<ButtonNew text="Medium button" size="md" />
<ButtonNew text="Large button" size="lg" />

// With loading state
<ButtonNew
  text="Save changes"
  isLoading={isSubmitting}
  onClick={handleSubmit}
/>

// Disabled state
<ButtonNew
  text="Disabled button"
  isDisabled={!isFormValid}
  onClick={handleClick}
/>
```

### ❌ Incorrect - Native HTML Button

```typescript
// DON'T DO THIS
<button onClick={handleClick}>Add credits</button>

<button className="primary-button" onClick={handleClick}>
  Add credits
</button>

<button
  disabled={isLoading}
  className="bg-blue-500 text-white px-4 py-2"
  onClick={handleClick}
>
  {isLoading ? "Loading..." : "Add credits"}
</button>
```

#### Text Inputs

### ✅ Correct - Use TextInput Components

```typescript
import { TextInputSmall, TextInput } from "src/components";

// Small text input
<TextInputSmall
  value={creditAmount}
  onChange={(e) => setCreditAmount(e.target.value)}
  placeholder="Enter amount"
  type="number"
/>

// Regular text input
<TextInput
  label="Email address"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="you@example.com"
  type="email"
/>

// With error state
<TextInput
  label="API key"
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  error="Invalid API key format"
/>
```

### ❌ Incorrect - Native HTML Input

```typescript
// DON'T DO THIS
<input
  type="text"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter email"
/>

<input className="custom-input" value={apiKey} onChange={handleChange} />
```

#### Dropdowns and Selects

### ✅ Correct - Use Dropdown Components

```typescript
import { Dropdown, DropdownNew } from "src/components";

<Dropdown
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  placeholder="Select an option"
/>

<DropdownNew
  options={modelOptions}
  selected={selectedModel}
  setSelected={setSelectedModel}
/>
```

### ❌ Incorrect - Native HTML Select

```typescript
// DON'T DO THIS
<select
  value={selectedValue}
  onChange={(e) => setSelectedValue(e.target.value)}
>
  <option value="">Select an option</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

#### Checkboxes and Toggles

### ✅ Correct - Use Toggle/Checkbox Components

```typescript
import { Toggle, Checkbox } from "src/components";

// Toggle switch
<Toggle
  isChecked={isEnabled}
  onChange={setIsEnabled}
  label="Enable feature"
/>

// Checkbox
<Checkbox
  isChecked={isAgreed}
  onChange={setIsAgreed}
  label="I agree to the terms"
/>
```

### ❌ Incorrect - Native HTML Input

```typescript
// DON'T DO THIS
<input
  type="checkbox"
  checked={isEnabled}
  onChange={(e) => setIsEnabled(e.target.checked)}
/>

<input type="checkbox" id="agree" />
<label htmlFor="agree">I agree to the terms</label>
```

#### Text Areas

### ✅ Correct - Use TextArea Component

```typescript
import { TextArea } from "src/components";

<TextArea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Enter description"
  rows={4}
/>;
```

### ❌ Incorrect - Native HTML Textarea

```typescript
// DON'T DO THIS
<textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  placeholder="Enter description"
/>
```

### How to Find the Right Component

1. **Check component folders:**

   - `src/components/Buttons/` - All button variants
   - `src/components/Inputs/` - Text inputs, dropdowns, selectors
   - `src/components/Forms/` - Form-related components
   - `src/components/Dialogs/` - Modals, popovers, drawers
   - `src/components/Display/` - Charts, progress indicators

2. **Look at similar pages:**

   - Find a page with similar UI elements
   - See what components they use
   - Reuse the same components

3. **Check the component index:**

   - Import from `src/components` to see available components
   - Review `src/components/index.ts` for exported components

4. **Ask before creating:**
   - Before using native HTML, search for an existing component
   - If unsure, ask team members or check documentation

### When Native HTML is Acceptable

Native HTML elements are acceptable ONLY for:

1. **Semantic structure:** `<div>`, `<span>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`
2. **Text content:** `<p>`, `<h1>` through `<h6>`, `<strong>`, `<em>`
3. **Lists:** `<ul>`, `<ol>`, `<li>`
4. **Links:** `<a>` (though consider using ButtonNew with variant="link" for button-like links)
5. **Images:** `<img>` (when not using a custom Image component)

### Example: Complete Form with Custom Components

```typescript
import {
  Modal,
  ButtonNew,
  TextInputSmall,
  Dropdown,
  Toggle,
  TextArea,
} from "src/components";

export const CreateItemModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");

  return (
    <Modal
      variant="md"
      title="Create new item"
      isModalOpen={isOpen}
      setIsModalOpen={setIsOpen}
      primaryButtonText="Create"
      primaryButtonOnClick={handleCreate}
    >
      <div className="flex flex-col gap-sm w-full">
        <TextInputSmall
          label="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />

        <Dropdown
          label="Category"
          options={categoryOptions}
          value={category}
          onChange={setCategory}
          placeholder="Select category"
        />

        <Toggle
          isChecked={isActive}
          onChange={setIsActive}
          label="Active status"
        />

        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter description"
          rows={4}
        />
      </div>
    </Modal>
  );
};
```

---

## Text Capitalization

**Rule:** Use sentence case (capitalize only the first word and proper nouns) for all text elements in the application.

### ✅ Correct - Sentence Case

```typescript
// Buttons
<ButtonNew text="Add credits" />
<ButtonNew text="Save changes" />
<ButtonNew text="Delete item" />

// Form labels
<TextInput label="Email address" />
<TextInput label="Organization name" />

// Page titles
<PageContent title="API key management" />
<PageContent title="Request logs" />

// Toast messages
dispatchNotification({ title: "Settings saved successfully" })
dispatchNotification({ title: "Failed to update configuration" })

// Table headers
const columns = [
  { header: "Model name", accessor: "name" },
  { header: "Last used", accessor: "lastUsed" },
  { header: "Status", accessor: "status" }
];
```

### ❌ Incorrect - Title Case

```typescript
// DON'T DO THIS
<ButtonNew text="Add Credits" />
<TextInput label="Email Address" />
<PageContent title="API Key Management" />
dispatchNotification({ title: "Settings Saved Successfully" })
```

### Exceptions

1. **Proper nouns** - Always capitalize: "OpenAI", "Anthropic", "Keywords AI"
2. **Acronyms** - Keep uppercase: "API", "JSON", "HTTP"
3. **Product names** - Use official capitalization: "GPT-4", "Claude"

```typescript
// Correct use of exceptions
<ButtonNew text="Connect to OpenAI" />
<PageContent title="API key management" />
<span>Integrate with GPT-4 and Claude</span>
```

---

## Avoid Unnecessary State

**Rule:** Do NOT create state variables for values that can be derived from existing state, props, or other data. Derived values should be computed directly in the render or using `useMemo`.

### Why This Matters

- **Single source of truth:** Avoids sync issues between related pieces of state
- **Fewer bugs:** No need to remember to update derived state when source changes
- **Simpler code:** Less state management logic, fewer `useEffect` hooks
- **Better performance:** React is optimized for computing derived values during render

### ✅ Correct - Derived Values

```typescript
// Good: Derive values from existing state/props
const UserList = ({ users }: { users: User[] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Derived: filtered users computed from state
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !selectedRole || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Derived: count computed from filtered result
  const userCount = filteredUsers.length;

  // Derived: check if list is empty
  const hasNoResults = filteredUsers.length === 0 && searchQuery.length > 0;

  return (
    <div>
      <span>{userCount} users found</span>
      {hasNoResults && <span>No results for "{searchQuery}"</span>}
      {filteredUsers.map((user) => <UserCard key={user.id} user={user} />)}
    </div>
  );
};
```

```typescript
// Good: Derive validation state
const PaymentForm = () => {
  const [amount, setAmount] = useState("");

  // Derived: validation computed from amount
  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount >= 10 && parsedAmount <= 10000;
  const hasAmountError = amount.length > 0 && !isValidAmount;

  return (
    <TextInputSmall
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      error={hasAmountError ? "Amount must be between $10 and $10,000" : undefined}
    />
  );
};
```

```typescript
// Good: Use useMemo for expensive computations
const DataTable = ({ data }: { data: DataRow[] }) => {
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Derived with memoization for expensive sort operation
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  return <Table data={sortedData} />;
};
```

### ❌ Incorrect - Unnecessary State

```typescript
// BAD: Storing derived values in state
const UserList = ({ users }: { users: User[] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // DON'T DO THIS - unnecessary state for derived values
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [hasNoResults, setHasNoResults] = useState(false);

  // DON'T DO THIS - useEffect to sync derived state
  useEffect(() => {
    const filtered = users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = !selectedRole || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(filtered);
    setUserCount(filtered.length);
    setHasNoResults(filtered.length === 0 && searchQuery.length > 0);
  }, [users, searchQuery, selectedRole]);

  return (
    <div>
      <span>{userCount} users found</span>
      {/* ... */}
    </div>
  );
};
```

```typescript
// BAD: Duplicating props in state
const UserProfile = ({ user }: { user: User }) => {
  // DON'T DO THIS - copying props to state
  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);

  // This creates sync issues when props change!
  return (
    <div>
      <span>{userName}</span>
      <span>{userEmail}</span>
    </div>
  );
};

// CORRECT: Use props directly
const UserProfile = ({ user }: { user: User }) => {
  return (
    <div>
      <span>{user.name}</span>
      <span>{user.email}</span>
    </div>
  );
};
```

```typescript
// BAD: State for boolean that can be derived
const ItemList = ({ items }: { items: Item[] }) => {
  const [isEmpty, setIsEmpty] = useState(items.length === 0);

  useEffect(() => {
    setIsEmpty(items.length === 0);
  }, [items]);

  // CORRECT: Just compute it
  const isEmpty = items.length === 0;
};
```

### Common Patterns to Avoid

#### 1. Filtering/Sorting State

```typescript
// ❌ BAD
const [filteredItems, setFilteredItems] = useState([]);
useEffect(() => {
  setFilteredItems(items.filter(predicate));
}, [items, predicate]);

// ✅ GOOD
const filteredItems = items.filter(predicate);
// Or with memoization:
const filteredItems = useMemo(() => items.filter(predicate), [items, predicate]);
```

#### 2. Count/Length State

```typescript
// ❌ BAD
const [itemCount, setItemCount] = useState(0);
useEffect(() => {
  setItemCount(items.length);
}, [items]);

// ✅ GOOD
const itemCount = items.length;
```

#### 3. Validation State

```typescript
// ❌ BAD
const [isValid, setIsValid] = useState(false);
useEffect(() => {
  setIsValid(value.length > 0 && value.length < 100);
}, [value]);

// ✅ GOOD
const isValid = value.length > 0 && value.length < 100;
```

#### 4. Selected Item Details

```typescript
// ❌ BAD
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
const [selectedItemName, setSelectedItemName] = useState("");
useEffect(() => {
  setSelectedItemName(selectedItem?.name ?? "");
}, [selectedItem]);

// ✅ GOOD
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
const selectedItemName = selectedItem?.name ?? "";
```

#### 5. Transformed Data

```typescript
// ❌ BAD
const [formattedDate, setFormattedDate] = useState("");
useEffect(() => {
  setFormattedDate(formatDate(date));
}, [date]);

// ✅ GOOD
const formattedDate = formatDate(date);
```

### When State IS Necessary

State is appropriate when:

1. **User input:** Values that change based on user interaction
2. **UI state:** Modal open/closed, accordion expanded, tab selection
3. **Async data:** Data fetched from APIs (though prefer Redux for shared data)
4. **Timers/intervals:** Values that change over time independently
5. **Refs to previous values:** When you need to compare with previous render

```typescript
// These are legitimate uses of state
const [searchQuery, setSearchQuery] = useState(""); // User input
const [isModalOpen, setIsModalOpen] = useState(false); // UI state
const [selectedTab, setSelectedTab] = useState("overview"); // UI state
const [elapsedTime, setElapsedTime] = useState(0); // Timer value
```

### Decision Flowchart

Ask yourself before creating state:

1. **Can this value be computed from props?** → Don't use state, derive it
2. **Can this value be computed from other state?** → Don't use state, derive it
3. **Does this value need to persist across renders independently?** → Use state
4. **Is this value only used for display purposes?** → Probably derive it
5. **Would changing this value require updating other state too?** → Consider if one is derived from the other

---

## Summary Checklist

Before submitting a PR, verify:

- [ ] All boolean variables use "is" or "has" prefix
- [ ] Redux async thunks use "getXxx" naming (not "fetchXxx")
- [ ] API calls are in Redux slices, not components (unless exceptional case)
- [ ] Reused existing types and constants (checked before creating new ones)
- [ ] No thin wrapper components created
- [ ] Forms are inline in modals (unless complex enough to warrant separation)
- [ ] Used existing components from `src/components/` instead of native HTML elements
- [ ] All text uses sentence case (except proper nouns and acronyms)
- [ ] No unnecessary state (derived values are computed, not stored)

---

## Questions?

If you're unsure whether your code follows these conventions, ask yourself:

1. **Boolean naming:** Does every boolean have "is" or "has"?
2. **Redux actions:** Are my async thunks named "getXxx" not "fetchXxx"?
3. **API calls:** Is this API call in a Redux slice or do I have a good reason for it being in a component?
4. **DRY:** Did I check if a similar type/constant exists before creating a new one?
5. **Components:** Am I creating a thin wrapper or does this component add real value?
6. **Forms:** Is this form complex enough to warrant a separate component?
7. **Component usage:** Did I check `src/components/` before using native HTML elements?
8. **Text:** Is all my text in sentence case?
9. **State:** Can this value be derived from props or other state instead of stored?

When in doubt, look at existing code in the codebase for examples, or ask a team member for guidance.

---

**Last Updated:** January 28, 2026
