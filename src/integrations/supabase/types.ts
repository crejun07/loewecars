export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_events: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: string
          extra_data: Json | null
          id: string
          is_broadcast: boolean
          metadata: Json
          status: string
          title: string
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type?: string
          extra_data?: Json | null
          id?: string
          is_broadcast?: boolean
          metadata?: Json
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          extra_data?: Json | null
          id?: string
          is_broadcast?: boolean
          metadata?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auction_date: string | null
          auction_house: string | null
          brand: string
          created_at: string
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          image_url: string | null
          license_plate: string | null
          lot_reference: string | null
          mileage: number | null
          model: string
          notes: string | null
          payment_date: string | null
          payment_done: boolean
          picked_up: boolean
          picked_up_by: string | null
          picked_up_date: string | null
          purchase_price: number
          ready_for_pickup: boolean
          selling_price: number
          stock_request_status: string
          stock_vehicle_id: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          withdrawal_authorized: boolean
          year: number | null
        }
        Insert: {
          auction_date?: string | null
          auction_house?: string | null
          brand: string
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          lot_reference?: string | null
          mileage?: number | null
          model: string
          notes?: string | null
          payment_date?: string | null
          payment_done?: boolean
          picked_up?: boolean
          picked_up_by?: string | null
          picked_up_date?: string | null
          purchase_price?: number
          ready_for_pickup?: boolean
          selling_price?: number
          stock_request_status?: string
          stock_vehicle_id?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          withdrawal_authorized?: boolean
          year?: number | null
        }
        Update: {
          auction_date?: string | null
          auction_house?: string | null
          brand?: string
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          lot_reference?: string | null
          mileage?: number | null
          model?: string
          notes?: string | null
          payment_date?: string | null
          payment_done?: boolean
          picked_up?: boolean
          picked_up_by?: string | null
          picked_up_date?: string | null
          purchase_price?: number
          ready_for_pickup?: boolean
          selling_price?: number
          stock_request_status?: string
          stock_vehicle_id?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          withdrawal_authorized?: boolean
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_stock_vehicle_id_fkey"
            columns: ["stock_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          record_id: string | null
          summary: string
          table_name: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          summary: string
          table_name: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          summary?: string
          table_name?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          recipient_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      chat_reads: {
        Row: {
          conversation_key: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_key: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_key?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          dni: string | null
          email: string | null
          full_name: string
          id: string
          last_contact_date: string | null
          managed_by: string | null
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          dni?: string | null
          email?: string | null
          full_name: string
          id?: string
          last_contact_date?: string | null
          managed_by?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          dni?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_contact_date?: string | null
          managed_by?: string | null
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: []
      }
      online_appraisals: {
        Row: {
          appointment_date: string | null
          brand: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          horsepower: number | null
          id: string
          market_value: number | null
          mileage: number | null
          model: string
          notes: string | null
          offered_value: number | null
          reference: string | null
          status: Database["public"]["Enums"]["online_appraisal_status"]
          updated_at: string
          vehicle_age: string | null
          version: string | null
          wants_appointment: boolean
        }
        Insert: {
          appointment_date?: string | null
          brand: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          horsepower?: number | null
          id?: string
          market_value?: number | null
          mileage?: number | null
          model: string
          notes?: string | null
          offered_value?: number | null
          reference?: string | null
          status?: Database["public"]["Enums"]["online_appraisal_status"]
          updated_at?: string
          vehicle_age?: string | null
          version?: string | null
          wants_appointment?: boolean
        }
        Update: {
          appointment_date?: string | null
          brand?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          horsepower?: number | null
          id?: string
          market_value?: number | null
          mileage?: number | null
          model?: string
          notes?: string | null
          offered_value?: number | null
          reference?: string | null
          status?: Database["public"]["Enums"]["online_appraisal_status"]
          updated_at?: string
          vehicle_age?: string | null
          version?: string | null
          wants_appointment?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          can_view_sensitive: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          workspace: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          can_view_sensitive?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          can_view_sensitive?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          workspace?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string
          customer_budget: number | null
          id: string
          next_contact_date: string | null
          notes: string | null
          payment_method: string | null
          sale_status: Database["public"]["Enums"]["sale_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          customer_budget?: number | null
          id?: string
          next_contact_date?: string | null
          notes?: string | null
          payment_method?: string | null
          sale_status?: Database["public"]["Enums"]["sale_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          customer_budget?: number | null
          id?: string
          next_contact_date?: string | null
          notes?: string | null
          payment_method?: string | null
          sale_status?: Database["public"]["Enums"]["sale_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          cancellation_reason: string | null
          cost: number | null
          created_at: string
          delivery_date: string | null
          id: string
          managed_by: string | null
          notes: string | null
          order_date: string | null
          ordered_by: string | null
          part_name: string
          part_purpose: string | null
          part_reference: string | null
          payment_method: string | null
          payment_status: string
          status: Database["public"]["Enums"]["spare_part_status"]
          supplier: string | null
          updated_at: string
          vehicle_id: string | null
          workshop_id: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          managed_by?: string | null
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          part_name: string
          part_purpose?: string | null
          part_reference?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["spare_part_status"]
          supplier?: string | null
          updated_at?: string
          vehicle_id?: string | null
          workshop_id?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cost?: number | null
          created_at?: string
          delivery_date?: string | null
          id?: string
          managed_by?: string | null
          notes?: string | null
          order_date?: string | null
          ordered_by?: string | null
          part_name?: string
          part_purpose?: string | null
          part_reference?: string | null
          payment_method?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["spare_part_status"]
          supplier?: string | null
          updated_at?: string
          vehicle_id?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_parts_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshop"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          notes: string | null
          priority: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_appraisals: {
        Row: {
          alloy_wheels: boolean | null
          anti_theft: boolean | null
          appraisal_date: string
          appraisal_number: number
          appraisal_value: number | null
          assigned_to: string | null
          bluetooth: boolean | null
          body_type: string | null
          brand: string
          camera_360: boolean | null
          client_id: string | null
          climate_control: string | null
          clutch_done: boolean | null
          clutch_invoice: boolean | null
          color: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deal_status: Database["public"]["Enums"]["appraisal_status"]
          displacement: number | null
          doors: number | null
          drive_type: string | null
          electric_seats: boolean | null
          estimated_price: number | null
          first_registration_date: string | null
          follow_up_date: string | null
          front_camera: boolean | null
          fuel_other: string | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          has_invoices: boolean | null
          heated_seats: boolean | null
          horsepower: number | null
          id: string
          industrial_type: string | null
          interior_knob: string | null
          interior_seats: string | null
          interior_steering: string | null
          keys_count: number | null
          led_xenon: string | null
          license_plate: string | null
          metallic: boolean | null
          mileage: number | null
          model: string
          multifunction_steering: boolean | null
          navigator: boolean | null
          notes: string | null
          offered_price: number | null
          operation_type: string | null
          parcel_shelf: boolean | null
          photos: Json
          rear_camera: boolean | null
          service_history: boolean | null
          service_manual: boolean | null
          service_seal: boolean | null
          spare_wheel: boolean | null
          stock_request_status: string
          stock_vehicle_id: string | null
          sunroof: boolean | null
          timing_belt_done: boolean | null
          timing_belt_invoice: boolean | null
          tires_front: string | null
          tires_rear: string | null
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          upholstery: string | null
          vehicle_condition: string | null
          workshop_value: number | null
          year: number | null
        }
        Insert: {
          alloy_wheels?: boolean | null
          anti_theft?: boolean | null
          appraisal_date?: string
          appraisal_number?: number
          appraisal_value?: number | null
          assigned_to?: string | null
          bluetooth?: boolean | null
          body_type?: string | null
          brand: string
          camera_360?: boolean | null
          client_id?: string | null
          climate_control?: string | null
          clutch_done?: boolean | null
          clutch_invoice?: boolean | null
          color?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["appraisal_status"]
          displacement?: number | null
          doors?: number | null
          drive_type?: string | null
          electric_seats?: boolean | null
          estimated_price?: number | null
          first_registration_date?: string | null
          follow_up_date?: string | null
          front_camera?: boolean | null
          fuel_other?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_invoices?: boolean | null
          heated_seats?: boolean | null
          horsepower?: number | null
          id?: string
          industrial_type?: string | null
          interior_knob?: string | null
          interior_seats?: string | null
          interior_steering?: string | null
          keys_count?: number | null
          led_xenon?: string | null
          license_plate?: string | null
          metallic?: boolean | null
          mileage?: number | null
          model: string
          multifunction_steering?: boolean | null
          navigator?: boolean | null
          notes?: string | null
          offered_price?: number | null
          operation_type?: string | null
          parcel_shelf?: boolean | null
          photos?: Json
          rear_camera?: boolean | null
          service_history?: boolean | null
          service_manual?: boolean | null
          service_seal?: boolean | null
          spare_wheel?: boolean | null
          stock_request_status?: string
          stock_vehicle_id?: string | null
          sunroof?: boolean | null
          timing_belt_done?: boolean | null
          timing_belt_invoice?: boolean | null
          tires_front?: string | null
          tires_rear?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          upholstery?: string | null
          vehicle_condition?: string | null
          workshop_value?: number | null
          year?: number | null
        }
        Update: {
          alloy_wheels?: boolean | null
          anti_theft?: boolean | null
          appraisal_date?: string
          appraisal_number?: number
          appraisal_value?: number | null
          assigned_to?: string | null
          bluetooth?: boolean | null
          body_type?: string | null
          brand?: string
          camera_360?: boolean | null
          client_id?: string | null
          climate_control?: string | null
          clutch_done?: boolean | null
          clutch_invoice?: boolean | null
          color?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_status?: Database["public"]["Enums"]["appraisal_status"]
          displacement?: number | null
          doors?: number | null
          drive_type?: string | null
          electric_seats?: boolean | null
          estimated_price?: number | null
          first_registration_date?: string | null
          follow_up_date?: string | null
          front_camera?: boolean | null
          fuel_other?: string | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_invoices?: boolean | null
          heated_seats?: boolean | null
          horsepower?: number | null
          id?: string
          industrial_type?: string | null
          interior_knob?: string | null
          interior_seats?: string | null
          interior_steering?: string | null
          keys_count?: number | null
          led_xenon?: string | null
          license_plate?: string | null
          metallic?: boolean | null
          mileage?: number | null
          model?: string
          multifunction_steering?: boolean | null
          navigator?: boolean | null
          notes?: string | null
          offered_price?: number | null
          operation_type?: string | null
          parcel_shelf?: boolean | null
          photos?: Json
          rear_camera?: boolean | null
          service_history?: boolean | null
          service_manual?: boolean | null
          service_seal?: boolean | null
          spare_wheel?: boolean | null
          stock_request_status?: string
          stock_vehicle_id?: string | null
          sunroof?: boolean | null
          timing_belt_done?: boolean | null
          timing_belt_invoice?: boolean | null
          tires_front?: string | null
          tires_rear?: string | null
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          upholstery?: string | null
          vehicle_condition?: string | null
          workshop_value?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_appraisals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_appraisals_stock_vehicle_id_fkey"
            columns: ["stock_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_stock: {
        Row: {
          brand: string
          created_at: string
          entry_date: string
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          holder: string | null
          id: string
          image_url: string | null
          license_plate: string | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          location: string | null
          mileage: number | null
          model: string
          next_itv_date: string | null
          notes: string | null
          profit_margin: number | null
          purchase_price: number
          selling_price: number
          status: Database["public"]["Enums"]["stock_status"]
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string
          vat_type: string | null
          year: number | null
        }
        Insert: {
          brand: string
          created_at?: string
          entry_date?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          holder?: string | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          location?: string | null
          mileage?: number | null
          model: string
          next_itv_date?: string | null
          notes?: string | null
          profit_margin?: number | null
          purchase_price?: number
          selling_price?: number
          status?: Database["public"]["Enums"]["stock_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          vat_type?: string | null
          year?: number | null
        }
        Update: {
          brand?: string
          created_at?: string
          entry_date?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          holder?: string | null
          id?: string
          image_url?: string | null
          license_plate?: string | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          location?: string | null
          mileage?: number | null
          model?: string
          next_itv_date?: string | null
          notes?: string | null
          profit_margin?: number | null
          purchase_price?: number
          selling_price?: number
          status?: Database["public"]["Enums"]["stock_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string
          vat_type?: string | null
          year?: number | null
        }
        Relationships: []
      }
      workshop: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          priority: number
          status: Database["public"]["Enums"]["workshop_status"]
          task: string
          task_date: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["workshop_status"]
          task: string
          task_date?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["workshop_status"]
          task?: string
          task_date?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_stock"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_get_user_name: { Args: { _user_id: string }; Returns: string }
      get_email_by_username: { Args: { _username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_all_users: {
        Args: never
        Returns: {
          full_name: string
          id: string
          username: string
        }[]
      }
      user_can_edit_workspace: {
        Args: { _user_id: string; _workspace: string }
        Returns: boolean
      }
      user_can_view_workspace: {
        Args: { _user_id: string; _workspace: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "employee"
        | "comercial"
        | "mecanico"
        | "administracion"
        | "informatica"
        | "gerente"
      appraisal_status:
        | "pending"
        | "offer_sent"
        | "negotiating"
        | "purchased"
        | "rejected"
      client_status: "new" | "in_followup" | "closed"
      client_type: "seller" | "buyer" | "both"
      fuel_type:
        | "gasoline"
        | "diesel"
        | "hybrid"
        | "electric"
        | "lpg"
        | "other"
        | "plug_in_hybrid"
      listing_status: "listed" | "pending_listing" | "not_listed"
      online_appraisal_status:
        | "pending"
        | "interested"
        | "will_come"
        | "not_interested"
        | "too_many_km"
        | "rejected"
      sale_status:
        | "new_lead"
        | "interested"
        | "test_drive"
        | "negotiating"
        | "reserved"
        | "sold"
        | "lost"
      spare_part_status:
        | "pending"
        | "ordered"
        | "shipped"
        | "received"
        | "return"
        | "refunded"
        | "cancelled"
      stock_status:
        | "preparing"
        | "available"
        | "reserved"
        | "sold"
        | "own_lot"
        | "client"
      transmission_type: "manual" | "automatic"
      workshop_status: "pending" | "in_progress" | "completed" | "waiting_parts"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "employee",
        "comercial",
        "mecanico",
        "administracion",
        "informatica",
        "gerente",
      ],
      appraisal_status: [
        "pending",
        "offer_sent",
        "negotiating",
        "purchased",
        "rejected",
      ],
      client_status: ["new", "in_followup", "closed"],
      client_type: ["seller", "buyer", "both"],
      fuel_type: [
        "gasoline",
        "diesel",
        "hybrid",
        "electric",
        "lpg",
        "other",
        "plug_in_hybrid",
      ],
      listing_status: ["listed", "pending_listing", "not_listed"],
      online_appraisal_status: [
        "pending",
        "interested",
        "will_come",
        "not_interested",
        "too_many_km",
        "rejected",
      ],
      sale_status: [
        "new_lead",
        "interested",
        "test_drive",
        "negotiating",
        "reserved",
        "sold",
        "lost",
      ],
      spare_part_status: [
        "pending",
        "ordered",
        "shipped",
        "received",
        "return",
        "refunded",
        "cancelled",
      ],
      stock_status: [
        "preparing",
        "available",
        "reserved",
        "sold",
        "own_lot",
        "client",
      ],
      transmission_type: ["manual", "automatic"],
      workshop_status: ["pending", "in_progress", "completed", "waiting_parts"],
    },
  },
} as const
