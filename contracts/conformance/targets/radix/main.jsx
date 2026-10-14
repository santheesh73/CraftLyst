// Conformance demo page for Radix Primitives. Each section renders one contract with the
// library's own primitives and the smallest amount of glue; styling is in ../shared.css.
// Radix has no Button, Table, or Pagination primitive and no static alert; those contracts
// are recorded as not applicable in adapter.json (the button contract runs on Toggle).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Toggle from '@radix-ui/react-toggle';
import * as Form from '@radix-ui/react-form';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Popover from '@radix-ui/react-popover';
import * as Accordion from '@radix-ui/react-accordion';
import * as Toast from '@radix-ui/react-toast';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

function ToastDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Toast.Provider>
      <button type="button" id="rx-toast-btn" onClick={() => { setOpen(false); setTimeout(() => setOpen(true), 0); }}>Save settings</button>
      <Toast.Root className="toast" open={open} onOpenChange={setOpen} duration={10000}>
        <Toast.Title>Settings saved.</Toast.Title>
        <Toast.Close aria-label="Dismiss notification">×</Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  );
}

function App() {
  return (
    <Tooltip.Provider delayDuration={0}>
      <header>
        <NavigationMenu.Root aria-label="Main" id="rx-nav">
          <NavigationMenu.List>
            <NavigationMenu.Item><NavigationMenu.Link href="#home">Home</NavigationMenu.Link></NavigationMenu.Item>
            <NavigationMenu.Item><NavigationMenu.Link href="#docs" active>Docs</NavigationMenu.Link></NavigationMenu.Item>
            <NavigationMenu.Item>
              <NavigationMenu.Trigger id="rx-nav-more">More</NavigationMenu.Trigger>
              <NavigationMenu.Content>
                <ul>
                  <li><NavigationMenu.Link href="#blog">Blog</NavigationMenu.Link></li>
                  <li><NavigationMenu.Link href="#about">About</NavigationMenu.Link></li>
                </ul>
              </NavigationMenu.Content>
            </NavigationMenu.Item>
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </header>
      <main id="demo">
        <h1>Radix Primitives conformance demo</h1>

        <section id="c-button" aria-labelledby="h-button">
          <h2 id="h-button">Button (Toggle primitive)</h2>
          <Toggle.Root id="rx-toggle">Bold</Toggle.Root>
          <Toggle.Root id="rx-toggle-off" disabled>Italic</Toggle.Root>
        </section>

        <section id="c-text-field" aria-labelledby="h-text-field">
          <h2 id="h-text-field">Text field (Form)</h2>
          <Form.Root onSubmit={(e) => e.preventDefault()}>
            <Form.Field name="email">
              <Form.Label>Email address</Form.Label>
              <Form.Control asChild><input type="email" required /></Form.Control>
              <Form.Message match="valueMissing" className="error">Enter an email address.</Form.Message>
              <Form.Message match="typeMismatch" className="error">Enter an email address like name@example.com.</Form.Message>
            </Form.Field>
            <Form.Submit id="rx-email-submit">Save email</Form.Submit>
          </Form.Root>
        </section>

        <section id="c-select" aria-labelledby="h-select">
          <h2 id="h-select">Select</h2>
          <span id="rx-fruit-label">Fruit</span>
          <Select.Root defaultValue="apple">
            <Select.Trigger id="rx-select" aria-labelledby="rx-fruit-label rx-select"><Select.Value /></Select.Trigger>
            <Select.Portal>
              <Select.Content className="popup" position="popper">
                <Select.Viewport>
                  <Select.Item value="apple"><Select.ItemText>Apple</Select.ItemText></Select.Item>
                  <Select.Item value="banana"><Select.ItemText>Banana</Select.ItemText></Select.Item>
                  <Select.Item value="cherry"><Select.ItemText>Cherry</Select.ItemText></Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </section>

        <section id="c-dialog" aria-labelledby="h-dialog">
          <h2 id="h-dialog">Dialog</h2>
          <Dialog.Root>
            <Dialog.Trigger id="rx-dialog-open">Rename project</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="overlay" />
              <Dialog.Content className="dialog">
                <Dialog.Title>Rename project</Dialog.Title>
                <Dialog.Description>Pick a name your team will recognise.</Dialog.Description>
                <label htmlFor="rx-name">Project name</label>
                <input id="rx-name" defaultValue="Atlas" />
                <Dialog.Close>Cancel</Dialog.Close>
                <Dialog.Close>Save</Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </section>

        <section id="c-menu" aria-labelledby="h-menu">
          <h2 id="h-menu">Menu</h2>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger id="rx-menu-btn">Actions</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="popup">
                <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
                <DropdownMenu.Item>Archive</DropdownMenu.Item>
                <DropdownMenu.Item>Delete</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </section>

        <section id="c-tabs" aria-labelledby="h-tabs">
          <h2 id="h-tabs">Tabs</h2>
          <Tabs.Root defaultValue="plan">
            <Tabs.List aria-label="Billing" id="rx-tabs">
              <Tabs.Trigger value="plan">Plan</Tabs.Trigger>
              <Tabs.Trigger value="invoices">Invoices</Tabs.Trigger>
              <Tabs.Trigger value="payment">Payment</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="plan"><p>You are on the monthly plan.</p></Tabs.Content>
            <Tabs.Content value="invoices"><p>No invoices yet.</p></Tabs.Content>
            <Tabs.Content value="payment"><p>Card ending 4242.</p></Tabs.Content>
          </Tabs.Root>
        </section>

        <section id="c-tooltip" aria-labelledby="h-tooltip">
          <h2 id="h-tooltip">Tooltip and popover</h2>
          <Tooltip.Root>
            <Tooltip.Trigger id="rx-tip-btn">Copy link</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="tooltip" sideOffset={4}>Copies the share link</Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Popover.Root>
            <Popover.Trigger id="rx-pop-btn">Filters</Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="popup" aria-label="Filters">
                <label><input type="checkbox" /> Only open items</label>
                <Popover.Close>Done</Popover.Close>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </section>

        <section id="c-accordion" aria-labelledby="h-accordion">
          <h2 id="h-accordion">Accordion</h2>
          <Accordion.Root type="multiple" defaultValue={['shipping']}>
            <Accordion.Item value="shipping">
              <Accordion.Header><Accordion.Trigger className="acc">Shipping</Accordion.Trigger></Accordion.Header>
              <Accordion.Content><p>Ships in two days.</p></Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="returns">
              <Accordion.Header><Accordion.Trigger className="acc">Returns</Accordion.Trigger></Accordion.Header>
              <Accordion.Content><p>Thirty days, no questions.</p></Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="warranty">
              <Accordion.Header><Accordion.Trigger className="acc">Warranty</Accordion.Trigger></Accordion.Header>
              <Accordion.Content><p>One year.</p></Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </section>

        <section id="c-toast" aria-labelledby="h-toast">
          <h2 id="h-toast">Toast</h2>
          <ToastDemo />
        </section>
      </main>
    </Tooltip.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
