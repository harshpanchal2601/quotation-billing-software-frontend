import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { getCompanyRequest, listCompaniesRequest, type CompanyAddress, type CompanyContact } from '@features/companies';
import type { QuotationFormSubmitValues } from '../quotations.schema';

export function QuotationCustomerSection() {
  const { control, setValue, watch, formState: { errors } } = useFormContext<QuotationFormSubmitValues>();
  const selectedCompanyId = watch('companyId');

  const [companySearch, setCompanySearch] = useState('');

  // List companies for dropdown selection
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies', 'dropdown', companySearch],
    queryKeyHashFn: (key) => JSON.stringify(key),
    queryFn: () => listCompaniesRequest({ page: 1, limit: 50, search: companySearch || undefined, isActive: true, sortBy: 'name', sortOrder: 'asc' }),
  });

  const companyList = companiesData?.companies || [];

  // Fetch full company details when selectedCompanyId changes
  const { data: companyDetail, isLoading: isLoadingCompanyDetail } = useQuery({
    queryKey: ['companies', 'detail', selectedCompanyId],
    queryFn: () => getCompanyRequest(selectedCompanyId),
    enabled: Boolean(selectedCompanyId && selectedCompanyId > 0),
  });

  const contacts: CompanyContact[] = useMemo(() => companyDetail?.contacts || [], [companyDetail]);
  const addresses: CompanyAddress[] = useMemo(() => companyDetail?.addresses || [], [companyDetail]);

  const billingAddresses = useMemo(
    () => addresses.filter((a) => a.addressType === 'BILLING' || a.addressType === 'OTHER'),
    [addresses],
  );
  const shippingAddresses = useMemo(
    () => addresses.filter((a) => a.addressType === 'SHIPPING' || a.addressType === 'OTHER'),
    [addresses],
  );

  // Handle company selection
  const handleSelectCompany = (companyId: number | null) => {
    if (companyId) {
      setValue('companyId', companyId);
      setValue('companyContactId', null);
      setValue('billingAddressId', null);
      setValue('shippingAddressId', null);
    } else {
      setValue('companyId', 0 as unknown as number);
      setValue('companyContactId', null);
      setValue('billingAddressId', null);
      setValue('shippingAddressId', null);
    }
  };

  // Auto-select primary contact and addresses when company details load
  useEffect(() => {
    if (companyDetail) {
      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
      if (primaryContact && !watch('companyContactId')) {
        setValue('companyContactId', primaryContact.id);
      }

      const primaryBilling = billingAddresses.find((a) => a.isPrimary) || billingAddresses[0] || addresses[0];
      if (primaryBilling && !watch('billingAddressId')) {
        setValue('billingAddressId', primaryBilling.id);
      }

      const primaryShipping = shippingAddresses.find((a) => a.isPrimary) || shippingAddresses[0] || primaryBilling || addresses[0];
      if (primaryShipping && !watch('shippingAddressId')) {
        setValue('shippingAddressId', primaryShipping.id);
      }
    }
  }, [companyDetail, contacts, addresses, billingAddresses, shippingAddresses, setValue, watch]);

  const selectedCompany = companyList.find((c) => c.id === selectedCompanyId) || companyDetail;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.paper' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Customer & Address Selection
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          {/* Company Selection */}
          <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
            <Autocomplete
              size="small"
              options={companyList}
              getOptionLabel={(option) => `${option.companyCode} - ${option.name}`}
              value={selectedCompany || null}
              loading={isLoadingCompanies}
              onChange={(_e, newValue) => handleSelectCompany(newValue?.id || null)}
              onInputChange={(_e, newInputValue) => setCompanySearch(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer Company *"
                  placeholder="Type to search active companies..."
                  error={Boolean(errors.companyId)}
                  helperText={errors.companyId?.message}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingCompanies ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          {/* Contact Selection */}
          <Controller
            name="companyContactId"
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth disabled={!selectedCompanyId || isLoadingCompanyDetail}>
                <InputLabel id="contact-select-label">Customer Contact</InputLabel>
                <Select
                  {...field}
                  labelId="contact-select-label"
                  label="Customer Contact"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <MenuItem value="">No Contact Selected</MenuItem>
                  {contacts.map((cnt) => (
                    <MenuItem key={cnt.id} value={cnt.id}>
                      {cnt.name} {cnt.designation ? `(${cnt.designation})` : ''} {cnt.isPrimary ? '[Primary]' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          {/* Billing Address Selection */}
          <Controller
            name="billingAddressId"
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth disabled={!selectedCompanyId || isLoadingCompanyDetail}>
                <InputLabel id="billing-address-select-label">Billing Address</InputLabel>
                <Select
                  {...field}
                  labelId="billing-address-select-label"
                  label="Billing Address"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <MenuItem value="">No Billing Address</MenuItem>
                  {addresses.map((addr) => (
                    <MenuItem key={addr.id} value={addr.id}>
                      [{addr.addressType}] {addr.addressLine1}, {addr.city}, {addr.state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          {/* Shipping Address Selection */}
          <Controller
            name="shippingAddressId"
            control={control}
            render={({ field }) => (
              <FormControl size="small" fullWidth disabled={!selectedCompanyId || isLoadingCompanyDetail}>
                <InputLabel id="shipping-address-select-label">Shipping Address</InputLabel>
                <Select
                  {...field}
                  labelId="shipping-address-select-label"
                  label="Shipping Address"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                >
                  <MenuItem value="">Same as Billing / Default</MenuItem>
                  {addresses.map((addr) => (
                    <MenuItem key={addr.id} value={addr.id}>
                      [{addr.addressType}] {addr.addressLine1}, {addr.city}, {addr.state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
