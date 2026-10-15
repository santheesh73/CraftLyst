// Conformance demo page for React Aria Components. Each section renders one contract with
// the library's components and the smallest amount of glue; styling is in ../shared.css.
// React Aria Components has no pagination or site-navigation component; those contracts
// are recorded as not applicable in adapter.json. Toast is exported as UNSTABLE_*.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button, ToggleButton, Form, TextField, Label, Input, Text, FieldError,
  Select, SelectValue, Popover, ListBox, ListBoxItem,
  DialogTrigger, Modal, ModalOverlay, Dialog, Heading,
  MenuTrigger, Menu, MenuItem,
  Tabs, TabList, Tab, TabPanel,
  TooltipTrigger, Tooltip,
  DisclosureGroup, Disclosure, DisclosurePanel,
  Table, TableHeader, Column, TableBody, Row, Cell, SearchField,
  UNSTABLE_ToastQueue as ToastQueue, UNSTABLE_ToastRegion as ToastRegion, UNSTABLE_Toast as Toast, UNSTABLE_ToastContent as ToastContent
} from 'react-aria-components';

const toasts = new ToastQueue();
const PEOPLE = [
  { name: 'Mira', role: 'Design' },
  { name: 'Arun', role: 'Engineering' },
  { name: 'Zoe', role: 'Support' },
  { name: 'Bao', role: 'Finance' }
];

function PeopleTable() {
  const [sort, setSort] = useState(undefined);
  const [filter, setFilter] = useState('');
  const rows = useMemo(() => {
    const r = PEOPLE.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
    if (sort) r.sort((a, b) => (sort.direction === 'descending' ? -1 : 1) * a.name.localeCompare(b.name));
    return r;
  }, [sort, filter]);
  return (
    <>
      <SearchField value={filter} onChange={setFilter}>
        <Label>Filter by name</Label>
        <Input className="ra-filter" />
      </SearchField>
      <Table aria-label="Team members" className="ra-table" sortDescriptor={sort} onSortChange={setSort}>
        <TableHeader>
          <Column id="name" isRowHeader allowsSorting className="ra-sort">Name</Column>
          <Column id="role">Role</Column>
        </TableHeader>
        <TableBody items={rows}>
          {(p) => <Row id={p.name}><Cell>{p.name}</Cell><Cell>{p.role}</Cell></Row>}
        </TableBody>
      </Table>
    </>
  );
}

function App() {
  const [presses, setPresses] = useState(0);
  return (
    <main id="demo">
      <h1>React Aria Components conformance demo</h1>

      <section id="c-button" aria-labelledby="h-button">
        <h2 id="h-button">Button</h2>
        <Button className="ra-save" onPress={() => setPresses((n) => n + 1)}>Save draft</Button>
        <output className="ra-presses">{presses}</output>
        <ToggleButton className="ra-bold">Bold</ToggleButton>
        <Button className="ra-off" isDisabled>Publish</Button>
      </section>

      <section id="c-text-field" aria-labelledby="h-text-field">
        <h2 id="h-text-field">Text field</h2>
        <Form onSubmit={(e) => e.preventDefault()}>
          <TextField name="email" type="email" isRequired>
            <Label>Email address</Label>
            <Input className="ra-email" />
            <Text slot="description">We only use this for receipts.</Text>
            <FieldError className="error" />
          </TextField>
          <Button type="submit" className="ra-email-submit">Save email</Button>
        </Form>
      </section>

      <section id="c-select" aria-labelledby="h-select">
        <h2 id="h-select">Select</h2>
        <Select defaultSelectedKey="apple">
          <Label>Fruit</Label>
          <Button className="ra-select"><SelectValue /></Button>
          <Popover className="popup">
            <ListBox>
              <ListBoxItem id="apple">Apple</ListBoxItem>
              <ListBoxItem id="banana">Banana</ListBoxItem>
              <ListBoxItem id="cherry">Cherry</ListBoxItem>
            </ListBox>
          </Popover>
        </Select>
      </section>

      <section id="c-dialog" aria-labelledby="h-dialog">
        <h2 id="h-dialog">Dialog</h2>
        <DialogTrigger>
          <Button className="ra-dialog-open">Rename project</Button>
          <ModalOverlay className="overlay">
            <Modal>
              <Dialog className="dialog">
                {({ close }) => (
                  <>
                    <Heading slot="title">Rename project</Heading>
                    <TextField defaultValue="Atlas" autoFocus>
                      <Label>Project name</Label>
                      <Input />
                    </TextField>
                    <Button onPress={close}>Cancel</Button>
                    <Button onPress={close}>Save</Button>
                  </>
                )}
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </section>

      <section id="c-menu" aria-labelledby="h-menu">
        <h2 id="h-menu">Menu</h2>
        <MenuTrigger>
          <Button className="ra-menu-btn">Actions</Button>
          <Popover className="popup">
            <Menu>
              <MenuItem>Duplicate</MenuItem>
              <MenuItem>Archive</MenuItem>
              <MenuItem>Delete</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </section>

      <section id="c-tabs" aria-labelledby="h-tabs">
        <h2 id="h-tabs">Tabs</h2>
        <Tabs>
          <TabList aria-label="Billing" className="ra-tabs">
            <Tab id="plan">Plan</Tab>
            <Tab id="invoices">Invoices</Tab>
            <Tab id="payment">Payment</Tab>
          </TabList>
          <TabPanel id="plan"><p>You are on the monthly plan.</p></TabPanel>
          <TabPanel id="invoices"><p>No invoices yet.</p></TabPanel>
          <TabPanel id="payment"><p>Card ending 4242.</p></TabPanel>
        </Tabs>
      </section>

      <section id="c-tooltip" aria-labelledby="h-tooltip">
        <h2 id="h-tooltip">Tooltip and popover</h2>
        <TooltipTrigger delay={0}>
          <Button className="ra-tip-btn">Copy link</Button>
          <Tooltip className="tooltip">Copies the share link</Tooltip>
        </TooltipTrigger>
        <DialogTrigger>
          <Button className="ra-pop-btn">Filters</Button>
          <Popover className="popup">
            <Dialog aria-label="Filters">
              {({ close }) => (
                <>
                  <label><input type="checkbox" /> Only open items</label>
                  <Button onPress={close}>Done</Button>
                </>
              )}
            </Dialog>
          </Popover>
        </DialogTrigger>
      </section>

      <section id="c-accordion" aria-labelledby="h-accordion">
        <h2 id="h-accordion">Disclosure group</h2>
        <DisclosureGroup allowsMultipleExpanded defaultExpandedKeys={['shipping']}>
          <Disclosure id="shipping">
            <Heading level={3}><Button slot="trigger" className="acc">Shipping</Button></Heading>
            <DisclosurePanel><p>Ships in two days.</p></DisclosurePanel>
          </Disclosure>
          <Disclosure id="returns">
            <Heading level={3}><Button slot="trigger" className="acc">Returns</Button></Heading>
            <DisclosurePanel><p>Thirty days, no questions.</p></DisclosurePanel>
          </Disclosure>
          <Disclosure id="warranty">
            <Heading level={3}><Button slot="trigger" className="acc">Warranty</Button></Heading>
            <DisclosurePanel><p>One year.</p></DisclosurePanel>
          </Disclosure>
        </DisclosureGroup>
      </section>

      <section id="c-toast" aria-labelledby="h-toast">
        <h2 id="h-toast">Toast</h2>
        <Button className="ra-toast-btn" onPress={() => toasts.add({ title: 'Settings saved.' }, { timeout: 10000 })}>Save settings</Button>
      </section>

      <section id="c-table" aria-labelledby="h-table">
        <h2 id="h-table">Table</h2>
        <PeopleTable />
      </section>

      <ToastRegion queue={toasts} className="toast-viewport">
        {({ toast }) => (
          <Toast toast={toast} className="toast">
            <ToastContent><Text slot="title">{toast.content.title}</Text></ToastContent>
            <Button slot="close" aria-label="Dismiss notification">×</Button>
          </Toast>
        )}
      </ToastRegion>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
