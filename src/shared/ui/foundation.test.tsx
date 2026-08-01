import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { FormSection } from '../forms/FormSection';
import { ControlledCheckbox } from '../forms/controlled/ControlledCheckbox';
import { ControlledSwitch } from '../forms/controlled/ControlledSwitch';
import { ControlledTextField } from '../forms/controlled/ControlledTextField';
import { AppIconButton } from './actions/AppIconButton';
import { AppStatusChip } from './display/AppStatusChip';
import { InlineLoader } from './feedback/InlineLoader';

const textSchema = z.object({ name: z.string().min(2, 'Name is too short') });
type TextFormValues = z.infer<typeof textSchema>;
type BooleanFormValues = { isPrimary: boolean; enabled: boolean };

function TextFieldHarness({ disabled = false }: { disabled?: boolean }) {
  const form = useForm<TextFormValues>({
    resolver: zodResolver(textSchema),
    defaultValues: { name: '' },
    mode: 'onChange',
  });

  return (
    <ControlledTextField
      control={form.control}
      name="name"
      label="Name"
      helperText="Enter a name"
      required
      disabled={disabled}
      inputProps={{ 'data-testid': 'name-input' }}
    />
  );
}

function BooleanHarness({ disabled = false }: { disabled?: boolean }) {
  const form = useForm<BooleanFormValues>({
    defaultValues: { isPrimary: false, enabled: false },
  });

  return (
    <>
      <ControlledCheckbox
        control={form.control}
        name="isPrimary"
        label="Make primary"
        helperText="Only one primary value is allowed."
        disabled={disabled}
      />
      <ControlledSwitch
        control={form.control}
        name="enabled"
        label="Enabled"
        helperText="Controls whether the option is enabled."
        disabled={disabled}
      />
    </>
  );
}

describe('shared UI foundation primitives', () => {
  it('renders AppIconButton label and forwards safe IconButton props', () => {
    render(
      <AppIconButton label="Delete attachment" color="error" data-testid="delete-action">
        <DeleteOutlineOutlinedIcon />
      </AppIconButton>,
    );

    expect(screen.getByRole('button', { name: 'Delete attachment' })).toHaveAttribute(
      'data-testid',
      'delete-action',
    );
  });

  it('renders AppIconButton tooltip without replacing the accessible name', async () => {
    render(
      <AppIconButton label="Download invoice" tooltip="Download file">
        <DeleteOutlineOutlinedIcon />
      </AppIconButton>,
    );

    await userEvent.hover(screen.getByRole('button', { name: 'Download invoice' }));

    expect(await screen.findByText('Download file')).toBeInTheDocument();
  });

  it('prevents AppIconButton interaction while loading', () => {
    const onClick = vi.fn();

    render(
      <AppIconButton label="Preview PDF" isLoading loadingLabel="Loading preview" onClick={onClick}>
        <DeleteOutlineOutlinedIcon />
      </AppIconButton>,
    );

    const button = screen.getByRole('button', { name: 'Preview PDF' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByLabelText('Loading preview')).toBeInTheDocument();

    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders FormSection heading, description, actions and content', () => {
    render(
      <FormSection title="Company information" description="Visible helper copy." actions={<Button>Edit</Button>}>
        <div>Fields</div>
      </FormSection>,
    );

    expect(screen.getByRole('heading', { name: 'Company information' })).toBeInTheDocument();
    expect(screen.getByText('Visible helper copy.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
  });

  it('binds ControlledTextField values and forwards helper, required and disabled props', async () => {
    const { rerender } = render(<TextFieldHarness />);

    await userEvent.type(screen.getByRole('textbox', { name: /name/i }), 'Acme');

    expect(screen.getByRole('textbox', { name: /name/i })).toHaveValue('Acme');
    expect(screen.getByText('Enter a name')).toBeInTheDocument();
    expect(screen.getByTestId('name-input')).toBeRequired();

    rerender(<TextFieldHarness disabled />);

    expect(screen.getByRole('textbox', { name: /name/i })).toBeDisabled();
  });

  it('binds ControlledCheckbox and ControlledSwitch checked state', async () => {
    const { rerender } = render(<BooleanHarness />);

    const checkbox = screen.getByRole('checkbox', { name: 'Make primary' });
    const switchControl = screen.getByRole('checkbox', { name: 'Enabled' });

    expect(checkbox).not.toBeChecked();
    expect(switchControl).not.toBeChecked();

    await userEvent.click(checkbox);
    await userEvent.click(switchControl);

    expect(checkbox).toBeChecked();
    expect(switchControl).toBeChecked();
    expect(screen.getByText('Only one primary value is allowed.')).toBeInTheDocument();
    expect(screen.getByText('Controls whether the option is enabled.')).toBeInTheDocument();

    rerender(<BooleanHarness disabled />);

    expect(screen.getByRole('checkbox', { name: 'Make primary' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeDisabled();
  });

  it('renders AppStatusChip visible status text and supports chip props', () => {
    render(
      <AppStatusChip
        label="Accepted by email server"
        variant="success"
        appearance="outlined"
        icon={<CheckCircleOutlineOutlinedIcon />}
      />,
    );

    expect(screen.getByText('Accepted by email server')).toBeInTheDocument();
  });

  it('renders InlineLoader with polite status semantics', () => {
    render(<InlineLoader label="Generating PDF preview" />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Generating PDF preview')).toBeInTheDocument();
  });

  it('supports an unlabeled compact InlineLoader', () => {
    render(<InlineLoader label={null} size={16} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
