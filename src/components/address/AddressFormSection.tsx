import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useWatch,
  type FieldPath,
  type FieldValues,
  type PathValue,
  type UseFormReturn,
} from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
} from "../base";
import { LocationMapPicker } from "../maps/LocationMapPicker";
import type { LocationCatalog } from "../../features/tasks/api/attendance-lookup.service";
import { geoService } from "../../features/tasks/api/geo.service";
import { joinAddressParts, prefixedAddressPart } from "./address-format";

/**
 * Logical → concrete field-name mapping. Every consumer form owns different RHF
 * field names (`address_*` for users, `*_Onec` for students), so the shared
 * section is parameterised by the actual names instead of hard-coding them.
 * `houseNo` (บ้านเลขที่) and `moo` (หมู่) are kept as separate structured fields.
 */
export interface AddressFieldNames<T extends FieldValues> {
  houseNo: FieldPath<T>;
  moo: FieldPath<T>;
  street: FieldPath<T>;
  soi: FieldPath<T>;
  trok: FieldPath<T>;
  province: FieldPath<T>;
  district: FieldPath<T>;
  subDistrict: FieldPath<T>;
  postalCode: FieldPath<T>;
  latitude: FieldPath<T>;
  longitude: FieldPath<T>;
}

export interface AddressFormSectionProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  names: AddressFieldNames<T>;
  /** Province/district/sub-district catalog powering the cascading comboboxes. */
  catalog?: LocationCatalog;
  title?: string;
  disabled?: boolean;
  /**
   * Example placeholders belong on create forms (empty fields), not on edit
   * forms that already show the record's own data. Off by default.
   */
  showPlaceholders?: boolean;
  /**
   * Drop the pin automatically by geocoding the address when the record has an
   * address but no saved coordinates yet (mirrors the visit-link form). On by
   * default; the user can still drag the pin or re-run the geocode button.
   */
  autoGeocode?: boolean;
  /** Geocode through the page's existing backend-proxy mutation. */
  onGeocode?: (address: string) => Promise<boolean>;
  isGeocoding?: boolean;
  /** Rendered above the map (e.g. a geocode failure alert). */
  geocodeError?: ReactNode;
}

const ADDRESS_TEXT_FIELDS = [
  { key: "houseNo" as const, label: "บ้านเลขที่", placeholder: "เช่น 99/9" },
  { key: "moo" as const, label: "หมู่", placeholder: "เช่น 5" },
  { key: "trok" as const, label: "ตรอก", placeholder: "เช่น วัดใหม่" },
  { key: "soi" as const, label: "ซอย", placeholder: "เช่น สุขใจ 2" },
  { key: "street" as const, label: "ถนน", placeholder: "เช่น ประชาราษฎร์" },
];

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))));
}

/**
 * Canonical Thai address editor shared by the profile, user, and student forms.
 * Owns layout, wording, cascading province/district/sub-district comboboxes and
 * the editable map; each page keeps ownership of its schema and persistence.
 */
export function AddressFormSection<T extends FieldValues>({
  form,
  names,
  catalog,
  title = "ที่อยู่ติดต่อ",
  disabled = false,
  showPlaceholders = false,
  autoGeocode = true,
  onGeocode,
  isGeocoding = false,
  geocodeError,
}: AddressFormSectionProps<T>) {
  const setText = (name: FieldPath<T>, value: string) =>
    form.setValue(name, value as PathValue<T, FieldPath<T>>, { shouldDirty: true });

  const [houseNo, moo, street, soi, trok, province, district, subDistrict, postalCode, latitude, longitude] =
    useWatch({
      control: form.control,
      name: [
        names.houseNo,
        names.moo,
        names.street,
        names.soi,
        names.trok,
        names.province,
        names.district,
        names.subDistrict,
        names.postalCode,
        names.latitude,
        names.longitude,
      ],
    }) as Array<string | number | null | undefined>;

  const provinceValue = (province as string) ?? "";
  const districtValue = (district as string) ?? "";
  const subDistrictValue = (subDistrict as string) ?? "";

  const provinceOptions = useMemo(
    () => unique([provinceValue, ...(catalog?.provinces ?? [])]),
    [provinceValue, catalog],
  );
  const districtOptions = useMemo(
    () =>
      unique([
        districtValue,
        ...(catalog?.districts ?? [])
          .filter((row) => !provinceValue || row.province === provinceValue)
          .map((row) => row.district),
      ]),
    [districtValue, provinceValue, catalog],
  );
  const subDistrictOptions = useMemo(
    () =>
      unique([
        subDistrictValue,
        ...(catalog?.subDistricts ?? [])
          .filter((row) => !provinceValue || row.province === provinceValue)
          .filter((row) => !districtValue || row.district === districtValue)
          .map((row) => row.sub_district),
      ]),
    [subDistrictValue, districtValue, provinceValue, catalog],
  );

  const fullAddress = joinAddressParts([
    typeof houseNo === "string" ? houseNo : "",
    prefixedAddressPart("หมู่ ", typeof moo === "string" ? moo : ""),
    prefixedAddressPart("ตรอก", typeof trok === "string" ? trok : ""),
    prefixedAddressPart("ซอย", typeof soi === "string" ? soi : ""),
    prefixedAddressPart("ถนน", typeof street === "string" ? street : ""),
    subDistrictValue,
    districtValue,
    provinceValue,
    typeof postalCode === "string" ? postalCode : "",
  ]);

  const hasCoordinates = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const [editingCoordinate, setEditingCoordinate] = useState<"latitude" | "longitude" | null>(null);
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");
  const [lastLatitude, setLastLatitude] = useState<number | null>(null);
  const [lastLongitude, setLastLongitude] = useState<number | null>(null);

  const validLatitude =
    typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      ? latitude
      : null;
  const validLongitude =
    typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
      ? longitude
      : null;
  const latitudeValue = typeof latitude === "number" ? latitude : null;
  const longitudeValue = typeof longitude === "number" ? longitude : null;

  if (editingCoordinate !== "latitude" && !Object.is(lastLatitude, latitudeValue)) {
    setLastLatitude(latitudeValue);
    setLatitudeInput(
      validLatitude !== null
        ? validLatitude.toFixed(6)
        : Number.isFinite(latitudeValue)
          ? String(latitudeValue)
          : "",
    );
  }

  if (editingCoordinate !== "longitude" && !Object.is(lastLongitude, longitudeValue)) {
    setLastLongitude(longitudeValue);
    setLongitudeInput(
      validLongitude !== null
        ? validLongitude.toFixed(6)
        : Number.isFinite(longitudeValue)
          ? String(longitudeValue)
          : "",
    );
  }

  function updateCoordinate(kind: "latitude" | "longitude", rawValue: string): void {
    const name = kind === "latitude" ? names.latitude : names.longitude;
    const setInput = kind === "latitude" ? setLatitudeInput : setLongitudeInput;
    setInput(rawValue);

    const trimmed = rawValue.trim();
    const nextValue = trimmed === "" ? null : Number(trimmed);
    const storedValue = Number.isFinite(nextValue) || nextValue === null ? nextValue : Number.NaN;
    if (kind === "latitude") {
      setLastLatitude(storedValue);
    } else {
      setLastLongitude(storedValue);
    }
    form.setValue(
      name,
      storedValue as PathValue<T, FieldPath<T>>,
      { shouldDirty: true, shouldValidate: true },
    );
  }

  // Auto-pin: resolve the address to a point when the record has an address but
  // no saved coordinates yet, so the map is never blank on open (mirrors the
  // visit-link form). Once a coordinate exists the query is disabled.
  const autoGeocodeQuery = useQuery({
    queryKey: ["address-form-geocode", fullAddress],
    queryFn: () => geoService.geocodeProfileAddress(fullAddress),
    enabled: autoGeocode && !disabled && Boolean(fullAddress) && !hasCoordinates,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const setLatLng = form.setValue;
  const latName = names.latitude;
  const lngName = names.longitude;
  useEffect(() => {
    const result = autoGeocodeQuery.data;
    if (!result || hasCoordinates) {
      return;
    }
    setLatLng(latName, result.lat as PathValue<T, FieldPath<T>>, { shouldDirty: true });
    setLatLng(lngName, result.lng as PathValue<T, FieldPath<T>>, { shouldDirty: true });
  }, [autoGeocodeQuery.data, hasCoordinates, setLatLng, latName, lngName]);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="size-5 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {ADDRESS_TEXT_FIELDS.map(({ key, label, placeholder }) => (
            <FormItem key={key}>
              <FormLabel htmlFor={names[key]}>{label}</FormLabel>
              <Input
                id={names[key]}
                disabled={disabled}
                placeholder={showPlaceholders ? placeholder : undefined}
                {...registerField(form, names[key])}
              />
              <FormMessage<T> name={names[key]} />
            </FormItem>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormItem>
            <FormLabel htmlFor={names.province}>จังหวัด</FormLabel>
            <Combobox
              disabled={disabled}
              id={names.province}
              name={names.province}
              onChange={(next) => {
                setText(names.province, next);
                setText(names.district, "");
                setText(names.subDistrict, "");
                setText(names.postalCode, "");
              }}
              options={[
                { value: "", label: "เลือกจังหวัด" },
                ...provinceOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาจังหวัด"
              value={provinceValue}
            />
            <FormMessage<T> name={names.province} />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor={names.district}>อำเภอ/เขต</FormLabel>
            <Combobox
              disabled={disabled || !provinceValue}
              id={names.district}
              name={names.district}
              onChange={(next) => {
                setText(names.district, next);
                setText(names.subDistrict, "");
                setText(names.postalCode, "");
              }}
              options={[
                { value: "", label: "เลือกอำเภอ/เขต" },
                ...districtOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาอำเภอ/เขต"
              value={districtValue}
            />
            <FormMessage<T> name={names.district} />
          </FormItem>

          <FormItem>
            <FormLabel htmlFor={names.subDistrict}>ตำบล/แขวง</FormLabel>
            <Combobox
              disabled={disabled || !districtValue}
              id={names.subDistrict}
              name={names.subDistrict}
              onChange={(next) => {
                setText(names.subDistrict, next);
                setText(names.postalCode, "");
              }}
              options={[
                { value: "", label: "เลือกตำบล/แขวง" },
                ...subDistrictOptions.map((name) => ({ value: name, label: name })),
              ]}
              placeholder="ค้นหาตำบล/แขวง"
              value={subDistrictValue}
            />
            <FormMessage<T> name={names.subDistrict} />
          </FormItem>
        </div>

        <FormItem className="max-w-40">
          <FormLabel htmlFor={names.postalCode}>รหัสไปรษณีย์</FormLabel>
          <Input
            id={names.postalCode}
            disabled={disabled}
            inputMode="numeric"
            maxLength={5}
            placeholder={showPlaceholders ? "เช่น 10110" : undefined}
            {...registerField(form, names.postalCode)}
          />
          <FormMessage<T> name={names.postalCode} />
        </FormItem>

        <div className="space-y-3 border-t border-slate-200 pt-4">
          <div>
            <div>
              <div className="text-sm font-bold text-slate-700">พิกัดที่อยู่</div>
              <div className="text-xs text-slate-500">
                ค้นหา ปักหมุด หรือลงพิกัดโดยตรง แล้วตรวจตำแหน่งจริงก่อนบันทึก
              </div>
            </div>
          </div>

          <LocationMapPicker
            address={fullAddress || undefined}
            coordinateFields={
              !disabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel htmlFor={names.latitude}>Latitude</FormLabel>
                    <Input
                      aria-invalid={form.formState.errors[names.latitude] ? true : undefined}
                      id={names.latitude}
                      inputMode="decimal"
                      name={names.latitude}
                      onBlur={() => setEditingCoordinate(null)}
                      onChange={(event) => updateCoordinate("latitude", event.target.value)}
                      onFocus={() => setEditingCoordinate("latitude")}
                      placeholder="เช่น 13.756300"
                      value={latitudeInput}
                    />
                    <FormMessage<T> name={names.latitude} />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor={names.longitude}>Longitude</FormLabel>
                    <Input
                      aria-invalid={form.formState.errors[names.longitude] ? true : undefined}
                      id={names.longitude}
                      inputMode="decimal"
                      name={names.longitude}
                      onBlur={() => setEditingCoordinate(null)}
                      onChange={(event) => updateCoordinate("longitude", event.target.value)}
                      onFocus={() => setEditingCoordinate("longitude")}
                      placeholder="เช่น 100.501800"
                      value={longitudeInput}
                    />
                    <FormMessage<T> name={names.longitude} />
                  </FormItem>
                </div>
              ) : undefined
            }
            editable={!disabled}
            emptyDescription="ค้นหาจากที่อยู่ หรือคลิกบนแผนที่เพื่อปักหมุด"
            emptyTitle="ยังไม่มีพิกัด"
            geocodeError={geocodeError}
            isGeocoding={isGeocoding}
            lat={validLatitude}
            lng={validLongitude}
            markerLabel="พิกัดที่อยู่"
            onCoordinateChange={(coordinates) => {
              form.setValue(names.latitude, coordinates.lat as PathValue<T, FieldPath<T>>, { shouldDirty: true, shouldValidate: true });
              form.setValue(names.longitude, coordinates.lng as PathValue<T, FieldPath<T>>, { shouldDirty: true, shouldValidate: true });
            }}
            onGeocode={onGeocode}
            title="ตำแหน่งที่อยู่บนแผนที่"
          />
        </div>
      </CardContent>
    </Card>
  );
}
